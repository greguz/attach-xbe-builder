import * as fs from 'node:fs'

import {
  readXbeCertificate,
  readXbeHeader,
  readXbeImage,
  readXbeSections
} from './xbe.js'

export function injectXbeInfo (sourceXbe, targetXbe) {
  openFile(
    sourceXbe,
    'r', // read only game xbe
    undefined,
    fdSource => {
      openFile(
        targetXbe,
        'r+', // read its data, and also write new data (inject)
        undefined,
        fdTarget => doInject(fdSource, fdTarget)
      )
    }
  )
}

function openFile (file, flags, mode, handler) {
  const fd = fs.openSync(file, flags, mode)
  try {
    return handler(fd)
  } finally {
    fs.closeSync(fd)
  }
}

function doInject (fdSource, fdTarget) {
  // Verify both XBE files
  const sourceHeader = readXbeHeader(fdSource)
  const targetHeader = readXbeHeader(fdTarget)

  const sourceCertificate = readXbeCertificate(fdSource, sourceHeader)

  // inject whole certificate buffer
  fs.writeSync(
    fdTarget,
    sourceCertificate._buffer,
    0,
    sourceCertificate._buffer.byteLength,
    targetHeader.certificateAddress - targetHeader.baseAddress
  )

  // TODO: why? what? hm
  const version = Buffer.from('01000080', 'hex')
  fs.writeSync(
    fdTarget,
    version,
    0,
    version.byteLength,
    targetHeader.certificateAddress - targetHeader.baseAddress + 172
  )

  // find xbx file section indo
  const section = readXbeSections(fdSource, sourceHeader).find(
    item => item.name === '$$XTIMAGE'
  )
  if (section) {
    const image = readXbeImage(fdSource, section)

    // move to xpr0 virtual address
    const imageAddressBuffer = Buffer.alloc(4)
    fs.readSync(
      fdTarget,
      imageAddressBuffer,
      0,
      imageAddressBuffer.byteLength,
      1060
    )
    const imageAddress = imageAddressBuffer.readUInt32LE()

    // is the data size before the XPR0 required
    const baseSize = (image.byteLength + imageAddress)
    const baseSizeBuffer = Buffer.alloc(4)
    baseSizeBuffer.writeUInt32LE(baseSize)
    fs.writeSync(
      fdTarget,
      baseSizeBuffer,
      0,
      baseSizeBuffer.byteLength,
      268 // move to base file size
    )

    const imageSizeBuffer = Buffer.alloc(4)
    imageSizeBuffer.writeUInt32LE(image.byteLength)
    fs.writeSync(
      fdTarget,
      imageSizeBuffer,
      0,
      imageSizeBuffer.byteLength,
      1056 // move to xpr0 virtual size address
    )
    fs.writeSync(
      fdTarget,
      imageSizeBuffer,
      0,
      imageSizeBuffer.byteLength,
      1064 // move to xpr0 raw size address
    )

    fs.writeSync(
      fdTarget,
      image,
      0,
      image.byteLength,
      imageAddress // move to xpr0 start offset
    )
  }
}
