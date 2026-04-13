import { Injectable } from '@angular/core';
import { DecryptedDocument } from 'app/models/entry.models';

@Injectable({
  providedIn: 'root',
})
export class CachingService {
  private documentCache = new Map<string, DecryptedDocument>();
  private readonly DOCUMENT_MAX_ENTRIES = 1000;

  private thumbnailCache = new Map<string, File[]>();
  private readonly THUMBNAIL_MAX_ENTRIES = 20;

  private attachmentCache = new Map<string, File[]>();
  private readonly ATTACHMENT_MAX_ENTRIES = 5;

  setDocumentCache(id: string, value: DecryptedDocument) {
    if (this.documentCache.size >= this.DOCUMENT_MAX_ENTRIES) {
      const keys = this.documentCache.keys().next();
      if (!keys.done) this.documentCache.delete(keys.value);
    }

    this.documentCache.set(id, value);
  }

  setAttachmentCache(id: string, files: File[]) {
    if (this.attachmentCache.size >= this.ATTACHMENT_MAX_ENTRIES) {
      const keys = this.attachmentCache.keys().next();
      if (!keys.done) this.attachmentCache.delete(keys.value);
    }

    this.attachmentCache.set(id, files);
  }

  setThumbnailCache(id: string, files: File[]) {
    if (this.thumbnailCache.size >= this.THUMBNAIL_MAX_ENTRIES) {
      const keys = this.thumbnailCache.keys().next();
      if (!keys.done) this.thumbnailCache.delete(keys.value);
    }

    this.thumbnailCache.set(id, files);
  }

  getDocumentCache(id: string) {
    if (this.documentCache.has(id)) {
      return this.documentCache.get(id);
    }

    return null;
  }

  getAttachmentCache(id: string) {
    if (this.attachmentCache.has(id)) {
      return this.attachmentCache.get(id);
    }

    return null;
  }

  getThumbnailCache(id: string) {
    if (this.thumbnailCache.has(id)) {
      return this.thumbnailCache.get(id);
    }

    return null;
  }

  clearSingleCache(id: string) {
    this.documentCache.delete(id);
    this.attachmentCache.delete(id);
    this.thumbnailCache.delete(id);
  }

  clearAllCache() {
    this.documentCache.clear();
    this.attachmentCache.clear();
    this.thumbnailCache.clear();
  }
}
