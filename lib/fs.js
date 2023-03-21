import { access } from 'node:fs/promises'

export async function exists (path) {
  try {
    await access(path)
    return true
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false
    } else {
      return Promise.reject(err)
    }
  }
}
