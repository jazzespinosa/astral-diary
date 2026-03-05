// export enum EntryType {
//   Default = 'Default',
//   Entry = 'Entry',
//   Draft = 'Draft',
// }

export type EntryParentComponentInput = 'home' | 'add-entry' | 'calendar' | 'view-entry';

export interface EntryQueryParams {
  mode: 'view' | 'edit';
}

export interface GetEntriesResponse {
  entryId: string;
  date: Date;
  title: string;
  content: string;
  attachmentsThumbnails: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GetDraftsResponse {
  id: string;
  date: Date;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetEntriesCalendarResponse {
  entryId: string;
  date: Date;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
