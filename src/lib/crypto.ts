import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16

function getEncryptionKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET is required for encryption')
  return scryptSync(secret, 'site-settings-encryption', 32)
}

/**
 * Encrypt a plaintext string. Returns base64-encoded "iv:authTag:ciphertext".
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  const authTag = cipher.getAuthTag()

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted,
  ].join(':')
}

/**
 * Decrypt a string produced by encrypt(). Returns the original plaintext.
 */
export function decrypt(encoded: string): string {
  const key = getEncryptionKey()
  const [ivB64, authTagB64, ciphertext] = encoded.split(':')

  if (!ivB64 || !authTagB64 || !ciphertext) {
    throw new Error('Invalid encrypted format')
  }

  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
