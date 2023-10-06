use std::env;

pub struct CliOptions {
  pub print_help: bool,
  pub print_version: bool,
  pub source_file: Option<String>,
  pub target_file: Option<String>,
}

pub fn parse_cli_options() -> Result<CliOptions, String> {
  let mut options = CliOptions {
    print_help: false,
    print_version: false,
    source_file: Option::None,
    target_file: Option::None,
  };

  let mut waiting_output = false;

  for arg in env::args().skip(1) {
    if waiting_output {
      waiting_output = false;
      options.target_file = Option::Some(arg);
    } else if arg.eq("-h") || arg.eq("--help") {
      options.print_help = true;
    } else if arg.eq("-v") || arg.eq("--version") {
      options.print_version = true;
    } else if arg.eq("-o") || arg.eq("--output") {
      if options.target_file.is_some() {
        return Err(String::from("muliple outputs are not allowed"));
      } else {
        waiting_output = true;
      }
    } else if arg.chars().nth(0).unwrap() == '-' {
      return Err(String::from("unsupported flag found"));
    } else if options.source_file.is_some() {
      return Err(String::from("multiple input specified"));
    } else {
      options.source_file = Option::Some(arg);
    }
  }

  return Ok(options);
}
