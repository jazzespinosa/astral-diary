import { inject, Injectable } from '@angular/core';
import { DataUrl, NgxImageCompressService } from 'ngx-image-compress';
import { firstValueFrom } from 'rxjs';
import { EncryptionService } from './encryption.service';
import { CompressionService } from './compression.service';
import { ApiClientService } from './api-client.service';
import { GalleryItemFile, GalleryItem, FileType } from 'app/models/entry.models';
import { DomSanitizer } from '@angular/platform-browser';
import { CachingService } from './caching.service';
import { HashService } from './hash.service';

@Injectable({
  providedIn: 'root',
})
export class AttachmentService {
  private imageCompress = inject(NgxImageCompressService);
  private apiClientService = inject(ApiClientService);
  private encryptionService = inject(EncryptionService);
  private compressionService = inject(CompressionService);
  private hashService = inject(HashService);
  private cachingService = inject(CachingService);
  private domSanitizer = inject(DomSanitizer);

  async processIncomingAttachments(
    entityId: string,
    attachmentType: 'thumbnail' | 'attachment',
    attachmentId: string,
  ): Promise<GalleryItemFile[]> {
    const blob = await firstValueFrom(
      this.apiClientService.getAttachmentFile(entityId, attachmentType, attachmentId),
    );
    const decryptedBlob = await this.encryptionService.decryptFile(blob);
    const unzippedFiles = await this.compressionService.unarchiveAttachments(decryptedBlob);

    const fileCache: File[] = [];
    const items: GalleryItemFile[] = unzippedFiles.map((file) => {
      const url = URL.createObjectURL(file);
      const localUrl = this.domSanitizer.bypassSecurityTrustUrl(url);

      const item: GalleryItemFile = {
        fileName: file.name,
        objectUrl: url,
        localUrl: localUrl,
        file: file,
      };

      fileCache.push(file);
      return item;
    });

    return items;
  }

  getFilesFromCache(entityId: string, fileType: FileType): GalleryItemFile[] | null {
    let cachedFiles: File[] | null = null;
    switch (fileType) {
      case 'attachment':
        cachedFiles = this.cachingService.getAttachmentCache(entityId) ?? [];
        break;
      case 'thumbnail':
        cachedFiles = this.cachingService.getThumbnailCache(entityId) ?? [];
        break;
    }

    if (cachedFiles) {
      return cachedFiles.map((file) => {
        const url = URL.createObjectURL(file);
        const localUrl = this.domSanitizer.bypassSecurityTrustUrl(url);

        return {
          fileName: file.name,
          objectUrl: url,
          localUrl: localUrl,
          file: file,
        };
      });
    }

    return null;
  }

  saveFilesToCache(entityId: string, files: File[], fileType: FileType) {
    switch (fileType) {
      case 'attachment':
        this.cachingService.setAttachmentCache(entityId, files);
        break;
      case 'thumbnail':
        this.cachingService.setThumbnailCache(entityId, files);
        break;
    }
  }

  async processOutgoingAttachments(selectedFiles: File[]) {
    let encryptedAttachmentBlob: Blob | null = null;
    let encryptedThumbnailBlob: Blob | null = null;
    let attachmentHashes: string[] = [];

    if (selectedFiles.length > 0) {
      let thumbnails: File[] = [];
      for (const file of selectedFiles) {
        const thumbnail = await this.generateThumbnail(file);
        thumbnails.push(thumbnail);

        const hash = await this.hashService.hashFile(file);
        attachmentHashes.push(hash);
      }

      const archivedAttachments = await this.compressionService.archiveAttachments(selectedFiles);
      encryptedAttachmentBlob = await this.encryptionService.encryptFile(archivedAttachments);
      const archivedThumbnails = await this.compressionService.archiveAttachments(thumbnails);
      encryptedThumbnailBlob = await this.encryptionService.encryptFile(archivedThumbnails);
    }

    return {
      encryptedAttachmentBlob,
      encryptedThumbnailBlob,
      attachmentHashes,
    };
  }

  cleanupImageUrls(images: GalleryItem[]) {
    images.forEach((item) => {
      if (item.objectUrl) {
        URL.revokeObjectURL(item.objectUrl);
      }
    });
  }

  async generateThumbnail(file: File): Promise<File> {
    const orientation = await this.imageCompress.getOrientation(file);
    const fileUrl = URL.createObjectURL(file);

    return new Promise((resolve) => {
      this.imageCompress
        .compressFile(fileUrl, orientation, 30, 30, 200, 200)
        .then((result: DataUrl) => {
          resolve(this.dataURLtoFile(result, file.name));
        });
    });
  }

  private dataURLtoFile(dataurl: DataUrl, filename: string) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]); // Decode Base64
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    const blob = new Blob([u8arr], { type: mime });
    return new File([blob], filename, { type: mime });
  }
}
