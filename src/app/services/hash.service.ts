import { Injectable } from '@angular/core';
import xxhash from 'xxhash-wasm';

@Injectable({
  providedIn: 'root',
})
export class HashService {
  private hasherPromise = xxhash();

  async hashFile(file: File | Blob): Promise<string> {
    if (!file || file.size === 0) {
      throw new Error('File is empty or null');
    }

    const hasher = await this.hasherPromise;
    const buffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    const hash = hasher.h64Raw(uint8);

    return hash.toString(16).padStart(16, '0');
  }
}
