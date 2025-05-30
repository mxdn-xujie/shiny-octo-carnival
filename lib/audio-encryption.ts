export class AudioEncryption {
  static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

  static async encryptVoiceData(data: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );

    // 将 IV 和加密数据合并
    const result = new Uint8Array(iv.length + encryptedData.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encryptedData), iv.length);
    return result.buffer;
  }

  static async decryptVoiceData(encryptedData: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
    const iv = new Uint8Array(encryptedData.slice(0, 12));
    const data = encryptedData.slice(12);
    
    return await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
  }

  static generateSecureId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}