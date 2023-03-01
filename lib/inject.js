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
    const _ = Buffer.alloc(4)
    fs.readSync(fdTarget, _, 0, _.byteLength, 1060)
    const imageAddress = _.readUInt32LE()

    // is the data size before the XPR0 required
    const base_size = (image.byteLength + imageAddress)
    const base_size_buffer = Buffer.alloc(4)
    base_size_buffer.writeUInt32LE(base_size)
    fs.writeSync(
      fdTarget,
      base_size_buffer,
      0,
      base_size_buffer.byteLength,
      268 // move to base file size
    )

    const xbx_size_buffer = Buffer.alloc(4)
    xbx_size_buffer.writeUInt32LE(image.byteLength)
    fs.writeSync(
      fdTarget,
      xbx_size_buffer,
      0,
      xbx_size_buffer.byteLength,
      1056 // move to xpr0 virtual size address
    )
    fs.writeSync(
      fdTarget,
      xbx_size_buffer,
      0,
      xbx_size_buffer.byteLength,
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
