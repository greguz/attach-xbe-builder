export default {
  input: './cli.js',
  output: {
    file: './build/build-attach-xbe.cjs',
    format: 'cjs'
  },
  external: [
    'node:fs',
    'node:fs/promises',
    'node:os',
    'node:path'
  ]
}
