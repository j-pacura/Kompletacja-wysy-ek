import * as crypto from 'crypto';

/**
 * Hash a password using scrypt (Node.js built-in)
 * @param password - Plain text password
 * @returns Hashed password in format: salt:hash
 */
export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Generate a random salt (16 bytes)
    const salt = crypto.randomBytes(16).toString('hex');

    // Hash the password with scrypt
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);

      // Store salt and hash together
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verify a password against a hash
 * @param password - Plain text password to verify
 * @param hash - Stored hash in format: salt:hash
 * @returns True if password matches
 */
export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Split the stored hash into salt and hash
    const [salt, key] = hash.split(':');

    if (!salt || !key) {
      return resolve(false);
    }

    // Hash the provided password with the same salt
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);

      // Compare the hashes
      resolve(key === derivedKey.toString('hex'));
    });
  });
}

/**
 * Encrypt data using AES-256-GCM
 * @param data - Data to encrypt
 * @param password - Password for encryption
 * @returns Encrypted data in format: iv:authTag:encrypted
 */
export function encrypt(data: string, password: string): string {
  // Generate a key from password
  const key = crypto.scryptSync(password, 'salt', 32);

  // Generate random IV
  const iv = crypto.randomBytes(16);

  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  // Encrypt
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get auth tag
  const authTag = cipher.getAuthTag().toString('hex');

  // Return iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt data using AES-256-GCM
 * @param encryptedData - Encrypted data in format: iv:authTag:encrypted
 * @param password - Password for decryption
 * @returns Decrypted data
 */
export function decrypt(encryptedData: string, password: string): string {
  try {
    // Parse encrypted data
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted data format');
    }

    // Generate same key from password
    const key = crypto.scryptSync(password, 'salt', 32);

    // Create decipher
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed - invalid password or corrupted data');
  }
}
