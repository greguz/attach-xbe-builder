use std::fs::File;
use std::fs::OpenOptions;
use std::io::Write;
use std::process;

mod attach;
mod cli;
mod util;
mod xbe;

fn main() {
  match foo() {
    Ok(_) => {
      process::exit(0);
    },
    Err(err) => {
      print_help(Some(err));
      process::exit(1);
    }
  }
}

fn print_help(error: Option<String>) -> () {
  match error {
    Some(value) => {
      eprintln!("{}", value);
      eprintln!("");
    },
    None => {}
  }
  println!("DriveImageUtils (Cerbios version) attach.xbe builder");
  println!("");
  println!("Usage:`");
  println!("  build-attach-xbe [...OPTIONS] [SOURCE FILE]");
  println!("");
  println!("Options:");
  println!("  -h,  --help                     Print this help text and exit.");
  println!("  -o,  --output [TARGET FILE]     Output file path, defaults to 'attach.xbe'.");
  println!("  -v,  --version    ");
}

fn print_version() -> () {
  println!("v0.2.0");
}

fn foo() -> Result<(), String> {
  let options = cli::parse_cli_options()?;

  if options.print_help {
    print_help(None);
  } else if options.print_version {
    print_version();
  } else {
    let target_filepath = options.target_file.unwrap_or(
      String::from("attach.xbe")
    );

    let maybe_info: Option<XbeInfo> = match options.source_file {
      Some(value) => Some(read_xbe_info(&value)?),
      None => None,
    };

    write_xbe_info(&target_filepath, &maybe_info)?;
  }

  Ok(())
}

struct XbeInfo {
  certificate: [u8; 464],
  image: Option<XbeImageInfo>,
}

struct XbeImageInfo {
  section: xbe::XbeSection,
  buffer: Vec<u8>,
}

fn read_xbe_info(filepath: &String) -> Result<XbeInfo, String> {
  let mut file = OpenOptions::new()
    .read(true)
    .open(filepath)
    .map_err(|err| format!("error while reading {}: {}", filepath, err))?;

  let header = xbe::read_xbe_header(&mut file)?;
  let image = read_image_info(&mut file, &header);
  Ok(
    XbeInfo {
      certificate: xbe::read_xbe_certificate(&mut file, &header),
      image
    }
  )
}

fn read_image_info(file: &mut File, header: &xbe::XbeHeader) -> Option<XbeImageInfo> {
  let mut i: u32 = 0;
  while i < header.number_of_sections {
    let section = xbe::read_xbe_section(file, header, i);
    if section.name.eq("$$XTIMAGE") {
      let buffer = read_image_buffer(file, &section);
      return Option::Some(XbeImageInfo { section, buffer });
    } else {
      i = i + 1;
    }
  }

  return Option::None
}

fn read_image_buffer(file: &mut File, section: &xbe::XbeSection) -> Vec<u8> {
  let mut buffer: Vec<u8> = vec![0; section.raw_size as usize];
  util::read_at(file, section.raw_address, &mut buffer);
  buffer
}

fn write_xbe_info(filepath: &String, maybe_info: &Option<XbeInfo>) -> Result<(), String> {
  let mut file = OpenOptions::new()
    .create(true)
    .read(true)
    .write(true)
    .open(filepath)
    .map_err(|err| format!("error while writing {}: {}", filepath, err))?;

  // Retrieve the binary representation of the executable
  let hex = attach::get_attach_xbe();

  // Override the entire file
  file.write_all(&hex).unwrap();

  // Load current (new) XBE header
  let header = xbe::read_xbe_header(&mut file)?;

  match maybe_info {
    Some(info) => {
      // inject whole certificate buffer
      util::write_at(
        &mut file,
        header.certificate_address - header.base_address,
        &info.certificate
      );

      // TODO: uh?
      let version: [u8; 4] = [0x01, 0x00, 0x00, 0x80];
      util::write_at(
        &mut file,
        header.certificate_address - header.base_address + 172,
        &version
      );

      match &info.image {
        Some(data) => write_image_section(
          &mut file,
          &data.section,
          &data.buffer
        ),
        None => {},
      }
    },
    None => {},
  }

  Ok(())
}

fn write_image_section(
  file: &mut File,
  image_section: &xbe::XbeSection,
  image_buffer: &Vec<u8>
) -> () {
  let mut image_address_buffer: [u8; 4] = [0x00; 4];

  // move to xpr0 virtual address
  util::read_at(file, 1060, &mut image_address_buffer);

  let image_address = util::to_u32_le(&image_address_buffer, 0);

  // is the data size before the XPR0 required
  let base_size = image_section.raw_size + image_address;

  // move to base file size
  util::write_at(file, 268, &base_size.to_le_bytes());

  let image_size_buffer = image_section.raw_size.to_le_bytes();

  // move to xpr0 virtual size address
  util::write_at(file, 1056, &image_size_buffer);

  // move to xpr0 raw size address
  util::write_at(file, 1064, &image_size_buffer);

  // move to xpr0 start offset
  util::write_at(file, image_address, &image_buffer);
}
