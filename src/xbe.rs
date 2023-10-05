use std::fs::File;

use crate::util::{ read_at, to_u32_le };

pub struct XbeHeader {
  pub base_address: u32,
  pub certificate_address: u32,
  pub number_of_sections: u32,
  pub section_headers_address: u32,
}

pub fn read_xbe_header(file: &mut File) -> Result<XbeHeader, &'static str> {
  let mut buffer: [u8; 376] = [0x00; 376];

  read_at(file, 0, &mut buffer);

  if !String::from_utf8(buffer[0..4].to_vec()).unwrap().eq("XBEH") {
    return Err("not a xbox executable");
  }

  Ok(
    XbeHeader {
      base_address: to_u32_le(&buffer, 0x0104),
      certificate_address: to_u32_le(&buffer, 0x0118),
      number_of_sections: to_u32_le(&buffer, 0x011c),
      section_headers_address: to_u32_le(&buffer, 0x120),
    }
  )
}

pub fn read_xbe_certificate(file: &mut File, header: &XbeHeader) -> [u8; 464] {
  let address = header.certificate_address - header.base_address;
  let mut buffer: [u8; 464] = [0x00; 464];

  read_at(file, address, &mut buffer);

  buffer
}

pub struct XbeSection {
  pub name: String,
  pub raw_address: u32,
  pub raw_size: u32,
  pub section_name_address: u32,
}

pub fn read_xbe_section(
  file: &mut File,
  header: &XbeHeader,
  index: u32
) -> XbeSection {
  let mut buffer: [u8; 56] = [0x00; 56];
  let size: u32 = buffer.len() as u32;
  let address = (header.section_headers_address - header.base_address) + (index * size);

  read_at(file, address, &mut buffer);

  let section_name_address = to_u32_le(&buffer, 0x0014);
  XbeSection {
    name: read_xbe_section_name(file, section_name_address - header.base_address),
    raw_address: to_u32_le(&buffer, 0x000c),
    raw_size: to_u32_le(&buffer, 0x0010),
    section_name_address,
  }
}

fn read_xbe_section_name(file: &mut File, address: u32) -> String {
  let mut old_buffer: [u8; 20] = [0x00; 20];
  let mut new_buffer: Vec<u8> = Vec::new();

  read_at(file, address, &mut old_buffer);

  let mut i: usize = 0;
  while old_buffer[i] != 0x00 && i < old_buffer.len() {
    new_buffer.push(old_buffer[i]);
    i = i + 1;
  }

  String::from_utf8(new_buffer).unwrap()
}
