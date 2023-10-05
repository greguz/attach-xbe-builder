use std::fs::File;
use std::io::{ Read, Seek, SeekFrom, Write };

pub fn read_at(file: &mut File, position: u32, buffer: &mut [u8]) {
  file.seek(SeekFrom::Start(position as u64)).unwrap();
  file.read(buffer).unwrap();
}

pub fn write_at(file: &mut File, position: u32, buffer: &[u8]) {
  file.seek(SeekFrom::Start(position as u64)).unwrap();
  file.write(buffer).unwrap();
}

pub fn to_u32_le(buffer: &[u8], offset: usize) -> u32 {
  u32::from_le_bytes([
    buffer[offset],
    buffer[offset + 1],
    buffer[offset + 2],
    buffer[offset + 3],
  ])
}
