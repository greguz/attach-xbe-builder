import { open } from 'node:fs/promises'

import { readXbeCertificate, readXbeHeader, readXbeSections } from './xbe.js'

export async function injectXbeInfo (sourceXbe, targetXbe) {
  await processFile(
    sourceXbe,
    'r', // read only game xbe
    undefined,
    fhSource => processFile(
      targetXbe,
      'r+', // read its data, and also write new data (inject)
      undefined,
      fhTarget => doInject(fhSource, fhTarget)
    )
  )
}

async function processFile (path, flags, mode, handler) {
  const fh = await open(path, flags, mode)
  try {
    return await handler(fh)
  } finally {
    await fh.close()
  }
}

async function find (iterable, predicate) {
  let index = 0
  for await (const item of iterable) {
    if (predicate(item, index++)) {
      return item
    }
  }
}

async function doInject (fhSource, fhTarget) {
  // Verify both XBE files
  const sourceHeader = await readXbeHeader(fhSource)
  const targetHeader = await readXbeHeader(fhTarget)

  const sourceCertificate = await readXbeCertificate(fhSource, sourceHeader)

  // inject whole certificate buffer
  await fhTarget.write(
    sourceCertificate._buffer,
    0,
    sourceCertificate._buffer.byteLength,
    targetHeader.certificateAddress - targetHeader.baseAddress
  )

  // TODO: why? what? hm
  const version = Buffer.from('01000080', 'hex')
  await fhTarget.write(
    version,
    0,
    version.byteLength,
    targetHeader.certificateAddress - targetHeader.baseAddress + 172
  )

  // find xbx file section indo
  const section = await find(
    readXbeSections(fhSource, sourceHeader),
    item => item.name === '$$XTIMAGE'
  )
  if (section) {
    const image = Buffer.alloc(section.rawSize)
    await fhSource.read({
      buffer: image,
      position: section.rawAddress
    })

    // move to xpr0 virtual address
    const imageAddressBuffer = Buffer.alloc(4)
    await fhTarget.read({
      buffer: imageAddressBuffer,
      position: 1060
    })
    const imageAddress = imageAddressBuffer.readUInt32LE()

    // is the data size before the XPR0 required
    const baseSize = (image.byteLength + imageAddress)
    const baseSizeBuffer = Buffer.alloc(4)
    baseSizeBuffer.writeUInt32LE(baseSize)
    await fhTarget.write(
      baseSizeBuffer,
      0,
      baseSizeBuffer.byteLength,
      268 // move to base file size
    )

    const imageSizeBuffer = Buffer.alloc(4)
    imageSizeBuffer.writeUInt32LE(image.byteLength)
    await fhTarget.write(
      imageSizeBuffer,
      0,
      imageSizeBuffer.byteLength,
      1056 // move to xpr0 virtual size address
    )
    await fhTarget.write(
      imageSizeBuffer,
      0,
      imageSizeBuffer.byteLength,
      1064 // move to xpr0 raw size address
    )

    await fhTarget.write(
      image,
      0,
      image.byteLength,
      imageAddress // move to xpr0 start offset
    )
  }
}
