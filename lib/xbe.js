export async function readXbeHeader (fh) {
  const { buffer, bytesRead } = await fh.read({
    buffer: Buffer.alloc(376), // 0x178
    position: 0
  })

  if (
    bytesRead < buffer.byteLength ||
    buffer.subarray(0, 4).toString('ascii') !== 'XBEH'
  ) {
    throw new Error('not a xbox executable')
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

export async function readXbeCertificate (fh, header) {
  const _buffer = Buffer.alloc(464) // 0x1d0
  const _address = header.certificateAddress - header.baseAddress

  const { bytesRead } = await fh.read({
    buffer: _buffer,
    position: _address
  })
  if (bytesRead < _buffer.byteLength) {
    // Not enough bytes for the whole XBE certificate section
    throw new Error('truncated xbe certificate')
  }

  return {
    _address,
    _buffer
  }
}

export async function * readXbeSections (fh, header) {
  for (let i = 0; i < header.numberOfSections; i++) {
    yield readXbeSection(fh, header, i)
  }
}

export async function readXbeSection (fh, header, index) {
  const _buffer = Buffer.alloc(56) // 0x38
  const _address = (header.sectionHeadersAddress - header.baseAddress) + (index * _buffer.byteLength)

  const { bytesRead } = await fh.read({
    buffer: _buffer,
    position: _address
  })
  if (bytesRead < _buffer.byteLength) {
    throw new Error(`truncated xbe section #${index}`)
  }

  const rawAddress = _buffer.readUInt32LE(12) // 0x000C
  const rawSize = _buffer.readUInt32LE(16) // 0x0010
  const sectionNameAddress = _buffer.readUInt32LE(20) // 0x0014

  return {
    _address,
    _buffer,
    name: await readXbeSectionName(fh, sectionNameAddress - header.baseAddress),
    rawAddress,
    rawSize,
    sectionNameAddress
  }
}

async function readXbeSectionName (fh, address) {
  const { buffer } = await fh.read({
    buffer: Buffer.alloc(20),
    position: address
  })

  let index = 0
  while (index < buffer.byteLength && buffer[index] !== 0x00) {
    index++
  }

  return buffer.subarray(0, index).toString('ascii') // TODO: ASCII?
}
