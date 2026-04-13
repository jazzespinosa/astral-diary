import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { EncryptedPayload, JournalEntry } from 'app/models/entry.models';
import { environment } from 'environments/environment';
import { filter, firstValueFrom, take } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EncryptionService {
  private readonly auth = inject(Auth);
  private readonly http = inject(HttpClient);

  private readonly BASE_URL = environment.backendUrl;

  private sessionKey = signal<CryptoKey | null>(null);
  private initializationPromise: Promise<void> | null = null;

  async initSessionKey(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        const user = await firstValueFrom(
          authState(this.auth).pipe(
            filter((u) => u !== null),
            take(1),
          ),
        );

        if (!user) throw new Error('Not authenticated');

        const pepper = await firstValueFrom(
          this.http.get<{ pepper: string }>(`${this.BASE_URL}/crypto/pepper`),
        );

        const rawMaterial = new TextEncoder().encode(user.uid + pepper.pepper);
        const baseKey = await crypto.subtle.importKey('raw', rawMaterial, 'HKDF', false, [
          'deriveKey',
        ]);

        const salt = this.getSaltBytes();
        const info = new TextEncoder().encode('astral-diary-aes-gcm');

        const aesKey = await crypto.subtle.deriveKey(
          { name: 'HKDF', hash: 'SHA-256', salt: salt as any, info: info as any },
          baseKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt'],
        );

        this.sessionKey.set(aesKey);
      } finally {
        this.initializationPromise = null;
      }
    })();

    return this.initializationPromise;
  }

  clearSessionKey() {
    this.sessionKey.set(null);
    this.initializationPromise = null;
  }

  async ensureKeyReady(maxRetries = 5, delayMs = 500): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (this.initializationPromise) {
          await this.initializationPromise;
        }

        if (this.sessionKey()) {
          return;
        }

        await this.initSessionKey();

        if (this.sessionKey()) {
          return;
        }
      } catch (error) {
        console.warn(`[SessionKey] Attempt ${attempt} failed:`, error);

        if (attempt === maxRetries) {
          throw new Error(`Session key failed to initialize after ${maxRetries} attempts.`);
        }

        await this.delay(delayMs);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async encrypt(entry: JournalEntry): Promise<EncryptedPayload> {
    await this.ensureKeyReady();
    const key = this.sessionKey()!;

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(entry));

    const cipherBuf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      plaintext as BufferSource,
    );

    return {
      ciphertext: this.toBase64(new Uint8Array(cipherBuf)),
      iv: this.toBase64(iv),
      salt: this.toBase64(this.getSaltBytes()),
    };
  }

  async encryptFile(blob: Blob): Promise<Blob> {
    await this.ensureKeyReady();
    const key = this.sessionKey()!;

    const salt = this.getSaltBytes();
    const saltLengthHeader = new Uint8Array([salt.length]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const fileBuffer = await blob.arrayBuffer();

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      fileBuffer,
    );

    return new Blob([saltLengthHeader, salt as any, iv as any, encryptedBuffer], {
      type: 'application/octet-stream',
    });
  }

  async decrypt(payload: EncryptedPayload): Promise<JournalEntry> {
    await this.ensureKeyReady();
    const key = this.sessionKey()!;

    const plainBuf = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: this.fromBase64(payload.iv),
        tagLength: 128,
      } as AesGcmParams,
      key,
      this.fromBase64(payload.ciphertext) as BufferSource,
    );

    return JSON.parse(new TextDecoder().decode(plainBuf));
  }

  async decryptFile(encryptedBlob: Blob): Promise<Blob> {
    await this.ensureKeyReady();
    const key = this.sessionKey()!;

    const fullBuffer = await encryptedBlob.arrayBuffer();
    const saltLength = new Uint8Array(fullBuffer, 0, 1)[0];
    const salt = fullBuffer.slice(1, 1 + saltLength);
    const iv = fullBuffer.slice(1 + saltLength, 1 + saltLength + 12);
    const ciphertext = fullBuffer.slice(1 + saltLength + 12);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      ciphertext,
    );

    return new Blob([decryptedBuffer]);
  }

  private getSaltBytes(): Uint8Array {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    const saltString = 'astral-diary-v1-' + user.uid;
    return new TextEncoder().encode(saltString);
  }

  private toBase64(buf: Uint8Array): string {
    return btoa(String.fromCharCode(...buf));
  }

  private fromBase64(b64: string): Uint8Array {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
