import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { formatDate } from '@angular/common';
import { environment } from 'environments/environment';
import {
  EntrySearchQueryParam,
  GetDraftCountResponse,
  GetDraftResponse,
  GetEntriesCalendarResponse,
  GetEntryResponse,
  GetSearchEntriesResponse,
  GetUserMoodMapResponse,
  UpdatePublishResponse,
} from 'app/models/entry.models';
import { GetUserInfoResponse } from 'app/models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class ApiClientService {
  private http = inject(HttpClient);

  private readonly BASE_URL = environment.backendUrl;

  getUserInfo(date: Date) {
    return this.http.get<GetUserInfoResponse>(`${this.BASE_URL}/user/get-user-info`, {
      params: {
        currentDate: formatDate(date, 'yyyy-MM-dd', 'en-US'),
      },
    });
  }

  getUserMoodMap(date: Date) {
    return this.http.get<GetUserMoodMapResponse[]>(`${this.BASE_URL}/user/get-mood-map`, {
      params: {
        currentDate: formatDate(date, 'yyyy-MM-dd', 'en-US'),
      },
    });
  }

  saveUserAvatar(avatar: string) {
    return this.http.patch<{ avatar: string }>(`${this.BASE_URL}/user/save-avatar`, { avatar });
  }

  createEntry(formData: FormData) {
    return this.http.post(`${this.BASE_URL}/entry/create`, formData, { observe: 'response' });
  }

  createDraft(formData: FormData) {
    return this.http.post(`${this.BASE_URL}/draft/create`, formData);
  }

  publishDraft(draftId: string, formData: FormData) {
    return this.http.post<UpdatePublishResponse>(
      `${this.BASE_URL}/draft/publish/${draftId}`,
      formData,
    );
  }

  getDrafts() {
    return this.http.get<GetDraftResponse[]>(`${this.BASE_URL}/draft/get-all`);
  }

  getRecentEntries() {
    return this.http.get<GetEntryResponse[]>(`${this.BASE_URL}/entry/get-recent-entries`);
  }

  getSearchEntries(searchParams: EntrySearchQueryParam) {
    return this.http.get<GetSearchEntriesResponse>(`${this.BASE_URL}/entry/get-search-entries`, {
      params: {
        searchTerm: searchParams.q ?? '',
        dateFilter: searchParams.filter,
        date: searchParams.date ? formatDate(searchParams.date, 'yyyy-MM-dd', 'en-US') : '',
        sort: searchParams.sort,
        page: searchParams.page ?? 1,
        pageSize: 20,
      },
    });
  }

  getEntry(entryId: string) {
    return this.http.get<GetEntryResponse>(`${this.BASE_URL}/entry/get/${entryId}`);
  }

  getDraft(draftId: string) {
    return this.http.get<GetDraftResponse>(`${this.BASE_URL}/draft/get/${draftId}`);
  }

  countUserDrafts() {
    return this.http.get<GetDraftCountResponse>(`${this.BASE_URL}/draft/count`);
  }

  getCalendarEntries(date: Date) {
    const formattedDate = formatDate(date, 'yyyy-MM-dd', 'en-US');
    return this.http.get<GetEntriesCalendarResponse[]>(
      `${this.BASE_URL}/entry/get-calendar-entries`,
      {
        params: {
          date: formattedDate,
        },
      },
    );
  }

  updateEntry(entryId: string, formData: FormData) {
    return this.http.put<UpdatePublishResponse>(
      `${this.BASE_URL}/entry/update/${entryId}`,
      formData,
    );
  }

  updateDraft(draftId: string, formData: FormData) {
    return this.http.put<UpdatePublishResponse>(
      `${this.BASE_URL}/draft/update/${draftId}`,
      formData,
    );
  }

  deleteEntry(entryId: string) {
    return this.http.delete(`${this.BASE_URL}/entry/delete/${entryId}`);
  }

  deleteDraft(draftId: string) {
    return this.http.delete(`${this.BASE_URL}/draft/delete/${draftId}`);
  }
}
