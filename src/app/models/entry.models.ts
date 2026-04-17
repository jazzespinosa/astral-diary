import { SafeUrl } from '@angular/platform-browser';

export type EntryParentComponentInput =
  | 'home'
  | 'add-entry'
  | 'calendar'
  | 'view-entry'
  | 'edit-entry';

type CaseInsensitive<T extends string> =
  | T
  | Uppercase<T>
  | Lowercase<T>
  | Capitalize<T>
  | Uncapitalize<T>;

export type DateFilter = CaseInsensitive<'any' | 'exact' | 'before' | 'after'>;

export type Sort = CaseInsensitive<'asc' | 'desc'>;

export type EntryAccess = 'new' | 'view' | 'edit-entry' | 'edit-draft';

export interface JournalEntry {
  title: string;
  content: string;
}

export interface DeleteObject {
  entityId: string;
  title: string | null;
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  salt: string;
}

export class EntryValuesDefault {
  date: Date = new Date();
  title: string = '';
  content: string = '';
  mood: number = 0;
}

export interface GetUserMoodMapResponse {
  date: Date;
  mood: number;
}

export interface EntrySearchQueryParam {
  q: string | null;
  filter: DateFilter;
  date?: Date | null;
  mood: number | null;
  sort: Sort;
  sid?: string | null;
}

export interface EncryptedDocument {
  id: string;
  type: 'Entry' | 'Draft';
  date: Date;
  mood: number;
  encryptedContent: string;
  contentIv: string;
  contentSalt: string;
  attachmentId: string | null;
  attachmentHash: string | null;
  createdAt: Date;
  modifiedAt: Date;
  deletedAt: Date | null;
  publishedAt: Date | null;
}

export interface DecryptedDocument {
  id: string;
  type: 'entry' | 'draft';
  date: Date;
  mood: number;
  title: string;
  content: string;
  attachmentId: string | null;
  attachmentHash: string | null;
  createdAt: Date;
  modifiedAt: Date;
  deletedAt: Date | null;
  publishedAt: Date | null;
}

export interface GalleryItem {
  fileName: string;
  objectUrl: string;
  localUrl: SafeUrl;
}

export interface GalleryItemFile extends GalleryItem {
  file: File;
}

export type FileType = 'attachment' | 'thumbnail';

export interface EntryIdObj {
  id: number;
  entryId: string;
}

export interface GetCountResponse {
  count: number;
}

export interface UpdatePublishResponse {
  id: string;
}

export interface SearchEntriesResponse {
  items: EncryptedDocument[];
}

export interface PaginatedSearchResult {
  items: DecryptedDocument[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export type SubmitAction = 'create' | 'update-entry' | 'update-draft';
