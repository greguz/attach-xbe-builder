import * as fs from 'node:fs'
import { tmpdir } from 'node:os'
import * as path from 'node:path'

import { getAttachXbeBuffer } from './lib/attach.js'
import { injectXbeInfo } from './lib/inject.js'

const sourceXbe = process.argv[2]
const targetXbe = process.argv[3] || 'attach.xbe'
if (!sourceXbe) {
  console.log('missing file argument')
  console.log('abort')
} else {
  try {
    const tmpXbe = path.join(tmpdir(), `attach_${Date.now()}.xbe`)
    fs.writeFileSync(tmpXbe, getAttachXbeBuffer())
    injectXbeInfo(sourceXbe, tmpXbe)
    fs.copyFileSync(tmpXbe, targetXbe)
    console.log('all done')
  } catch (err) {
    console.error('build failed')
    console.error(err)
  }
}
