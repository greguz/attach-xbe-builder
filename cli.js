import { writeFile } from 'node:fs/promises'
import { EOL } from 'node:os'

import { getAttachXbeBuffer } from './lib/attach.js'
import { exists } from './lib/fs.js'
import { injectXbeInfo } from './lib/inject.js'

async function runProgram () {
  const options = {
    printHelp: false,
    printVersion: false,
    sourcePath: null,
    targetPath: null
  }

  const args = process.argv.slice(2)
    .map(arg => arg.trim())
    .filter(arg => arg.length > 0)

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '-h' || arg === '--help') {
      options.printHelp = true
    } else if (arg === '-v' || arg === '--version') {
      options.printVersion = true
    } else if (arg === '-o' || arg === '--output') {
      const next = args[i + 1]
      if (next && !/^-/.test(next)) {
        i++ // skip next argument
        options.targetPath = next
      }
    } else if (/^-/.test(arg)) {
      throw new Error(`unrecognized option '${arg}'`)
    } else if (options.sourcePath) {
      throw new Error('too many arguments')
    } else {
      options.sourcePath = arg
    }
  }
  if (!options.targetPath) {
    options.targetPath = 'attach.xbe'
  }
  if (options.sourcePath === options.targetPath) {
    throw new Error('cannot override source file')
  }

  if (options.printHelp) {
    console.log(getHelp())
    return
  }
  if (options.printVersion) {
    console.log(getVersion())
    return
  }

  if (options.sourcePath) {
    const ok = await exists(options.sourcePath)
    if (!ok) {
      throw new Error(`no such file ${options.sourcePath}`)
    }
  }

  await writeFile(options.targetPath, getAttachXbeBuffer())

  if (options.sourcePath) {
    await injectXbeInfo(options.sourcePath, options.targetPath)
  }
}

function getHelp () {
  let text = `DriveImageUtils (Cerbios version) attach.xbe builder${EOL}`
  text += `${EOL}`
  text += `Usage:${EOL}`
  text += `  build-attach-xbe [...OPTIONS] [SOURCE FILE] ${EOL}`
  text += `${EOL}`
  text += `Options:${EOL}`
  text += `  -h,  --help                     Print this help text and exit.${EOL}`
  text += `  -o,  --output [TARGET FILE]     Output file path, defaults to attach.xbe.${EOL}`
  text += `  -v,  --version                  Print version information and exit.${EOL}`
  return text
}

function getVersion () {
  return 'v0.1.0'
}

runProgram().then(
  () => {
    process.exitCode = 0
  },
  err => {
    console.error(err?.message || 'unknown error')
    console.error('')
    console.error(getHelp())
    process.exitCode = 1
  }
)
