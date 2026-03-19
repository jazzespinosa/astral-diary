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

export interface EntrySearchQueryParam {
  q: string | null;
  filter: DateFilter;
  date?: Date | null;
  sort: Sort;
  page: number;
  sid?: string | null;
}

interface BaseEntry {
  date: Date;
  title: string | null;
  content: string | null;
  createdAt: Date;
  modifiedAt: Date;
}

export class EntryValues {
  date: Date = new Date();
  title: string = '';
  content: string = '';
}

export interface AttachmentObjResponse {
  filePath: string;
  thumbnailPath: string;
  internalFileName: string;
  originalFileName: string;
}

export interface GalleryItem {
  internalFileName: string;
  localUrl: SafeUrl;
  objectUrl: string;
}

export interface GenericEntry extends BaseEntry {
  id: string;
  attachments: AttachmentObjResponse[] | null;
}

export interface GetEntryResponse extends BaseEntry {
  entryId: string;
  title: string;
  content: string;
  attachments: AttachmentObjResponse[] | null;
}

export interface GetDraftResponse extends BaseEntry {
  draftId: string;
  attachments: AttachmentObjResponse[] | null;
}

export interface GetDraftCountResponse {
  count: number;
}

export interface GetSearchEntriesResponse {
  items: GetEntryResponse[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface GetEntriesCalendarResponse extends BaseEntry {
  entryId: string;
  title: string;
  content: string;
  attachments: AttachmentObjResponse[] | null;
}

export type AttachmentType =
  | 'entry-thumbnail'
  | 'entry-attachment'
  | 'draft-thumbnail'
  | 'draft-attachment';
