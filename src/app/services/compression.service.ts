import { Injectable } from '@angular/core';
import * as fflate from 'fflate';

const ALREADY_COMPRESSED = new Set([
  'zip',
  'gz',
  'png',
  'jpg',
  'jpeg',
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
  'heic',
  'heif',
  '7z',
  'bz2',
  'rar',
  'gif',
  'webp',
  'webm',
  'mp4',
  'mov',
  'mp3',
  'aifc',
]);

@Injectable({
  providedIn: 'root',
})
export class CompressionService {
  private readonly alreadyCompressed = ALREADY_COMPRESSED;

  async archiveAttachments(files: File[]): Promise<Blob> {
    const zipObj: fflate.AsyncZippable = {};

    for (const file of files) {
      const buf = new Uint8Array(await file.arrayBuffer());
      const ext = file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase();
      const level = this.alreadyCompressed.has(ext) ? 0 : 6;

      zipObj[file.name] = [buf, { level }];
    }

    const zipped = await new Promise<Uint8Array>((resolve, reject) => {
      fflate.zip(zipObj, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    const zippedBuf = new Uint8Array(zipped).buffer;

    return new Blob([zippedBuf], { type: 'application/zip' });
  }

  async unarchiveAttachments(zipBlob: Blob): Promise<File[]> {
    const buf = new Uint8Array(await zipBlob.arrayBuffer());

    const unzipped = await new Promise<fflate.Unzipped>((resolve, reject) => {
      fflate.unzip(buf, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    return Object.entries(unzipped).map(([name, data]) => {
      const dataBuf = new Uint8Array(data).buffer;
      const type = this.getMimeType(name);
      return new File([dataBuf], name, { type });
    });
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      default:
        return 'application/octet-stream';
    }
  }
}
