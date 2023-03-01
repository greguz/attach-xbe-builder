import { readSync } from 'node:fs'

export function readXbeHeader (fd) {
  const buffer = Buffer.alloc(376) // 0x178

  const bytesRead = readSync(fd, buffer, 0, buffer.byteLength, 0)
  if (bytesRead < buffer.byteLength) {
    // Not enough bytes for the whole XBE header section
    throw new Error('This file is too short')
  }
  if (buffer.subarray(0, 4).toString('ascii') !== 'XBEH') {
    // Wrong magic numbers
    throw new Error('This is not an Xbox executable')
  }

  const baseAddress = buffer.readUInt32LE(260) // 0x0104
  const certificateAddress = buffer.readUInt32LE(280) // 0x0118
  const numberOfSections = buffer.readUInt32LE(284) // 0x011C
  const sectionHeadersAddress = buffer.readUInt32LE(288) // 0x120

  return {
    _address: 0,
    _buffer: buffer,
    baseAddress,
    certificateAddress,
    numberOfSections,
    sectionHeadersAddress
  }
}

export function readXbeCertificate (fd, header) {
  const _buffer = Buffer.alloc(464) // 0x1d0
  const _address = header.certificateAddress - header.baseAddress

  const bytesRead = readSync(fd, _buffer, 0, _buffer.byteLength, _address)
  if (bytesRead < _buffer.byteLength) {
    // Not enough bytes for the whole XBE certificate section
    throw new Error('This file is too short')
  }

  return {
    _address,
    _buffer
  }
}

export function readXbeSections (fd, header) {
  const sections = []
  for (let i = 0; i < header.numberOfSections; i++) {
    sections.push(readXbeSection(fd, header, i))
  }
  return sections
}

export function readXbeSection (fd, header, index) {
  const _buffer = Buffer.alloc(56) // 0x38
  const _address = (header.sectionHeadersAddress - header.baseAddress) + (index * _buffer.byteLength)

  const bytesRead = readSync(fd, _buffer, 0, _buffer.byteLength, _address)
  if (bytesRead < _buffer.byteLength) {
    throw new Error(`Section #${index} is partial`)
  }

  const rawAddress = _buffer.readUInt32LE(12) // 0x000C
  const rawSize = _buffer.readUInt32LE(16) // 0x0010
  const sectionNameAddress = _buffer.readUInt32LE(20) // 0x0014

  return {
    _address,
    _buffer,
    name: readXbeSectionName(fd, sectionNameAddress - header.baseAddress),
    rawAddress,
    rawSize,
    sectionNameAddress
  }
}

function readXbeSectionName (fd, address) {
  const buffer = Buffer.alloc(20)

  readSync(fd, buffer, 0, buffer.byteLength, address)

  let index = 0
  while (index < buffer.byteLength && buffer[index] !== 0x00) {
    index++
  }

  return buffer.subarray(0, index).toString('ascii') // TODO: ASCII?
}

export function readXbeImage (fd, section = {}) {
  if (section.name !== '$$XTIMAGE') {
    throw new Error('Image section not found')
  }
  const buffer = Buffer.alloc(section.rawSize)
  readSync(fd, buffer, 0, buffer.byteLength, section.rawAddress)
  return buffer
}
