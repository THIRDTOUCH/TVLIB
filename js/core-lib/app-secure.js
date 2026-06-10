class SecureStorage {
  constructor() {
    this.KEY_PREFIX = 'secure_';
    this.SALT = 'drama_workshop_2024';
    this.ITERATIONS = 10000;
    this.KEY_LENGTH = 256;
  }

  async _deriveKey(password) {
    const encoder = new TextEncoder();
    const salt = encoder.encode(this.SALT);
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: this.ITERATIONS, hash: 'SHA-256' },
      passwordKey,
      { name: 'AES-GCM', length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encrypt(text, password = this._getDefaultPassword()) {
    if (!text) return '';
    
    try {
      const key = await this._deriveKey(password);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
      
      return this._arrayBufferToBase64(iv) + ':' + this._arrayBufferToBase64(ciphertext);
    } catch (e) {
      console.error('Encryption failed:', e);
      return text;
    }
  }

  async decrypt(encryptedText, password = this._getDefaultPassword()) {
    if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
    
    try {
      const key = await this._deriveKey(password);
      const [ivB64, ciphertextB64] = encryptedText.split(':');
      const iv = this._base64ToArrayBuffer(ivB64);
      const ciphertext = this._base64ToArrayBuffer(ciphertextB64);
      const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
      
      const decoder = new TextDecoder();
      return decoder.decode(data);
    } catch (e) {
      console.error('Decryption failed:', e);
      return encryptedText;
    }
  }

  _getDefaultPassword() {
    let password = localStorage.getItem('secure_password');
    if (!password) {
      password = this._generateRandomPassword();
      localStorage.setItem('secure_password', password);
    }
    return password;
  }

  _generateRandomPassword() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  _arrayBufferToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  _base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async setItem(key, value) {
    if (typeof value === 'object') {
      value = JSON.stringify(value);
    }
    const encrypted = await this.encrypt(value);
    localStorage.setItem(this.KEY_PREFIX + key, encrypted);
  }

  async getItem(key) {
    const encrypted = localStorage.getItem(this.KEY_PREFIX + key);
    if (!encrypted) return null;
    
    const decrypted = await this.decrypt(encrypted);
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  }

  removeItem(key) {
    localStorage.removeItem(this.KEY_PREFIX + key);
  }

  clear() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(this.KEY_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  }
}

const SecureStorageManager = new SecureStorage();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SecureStorage, SecureStorageManager };
}