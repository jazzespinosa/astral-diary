import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { formatDate } from '@angular/common';
import { environment } from 'environments/environment';
import { from, map, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import {
  GetDraftsResponse,
  GetEntriesCalendarResponse,
  GetEntriesResponse,
} from 'app/models/entry.models';

@Injectable({
  providedIn: 'root',
})
export class EntryService {
  private http = inject(HttpClient);

  private readonly BASE_URL = environment.backendUrl;

  createEntry(formData: FormData) {
    return this.http.post(`${this.BASE_URL}/entry/create`, formData);
  }

  createDraft(formData: FormData) {
    return this.http.post(`${this.BASE_URL}/draft/create`, formData);
  }

  // getEntriesAll() {
  //   return this.http.get<GetEntriesResponse[]>(`${this.BASE_URL}/entry/get-all`);
  // }

  getDrafts() {
    return this.http.get<GetDraftsResponse[]>(`${this.BASE_URL}/draft/get-all`);
  }

  getRecentEntries() {
    return this.http.get<GetEntriesResponse[]>(`${this.BASE_URL}/entry/get-recent-entries`);
  }

  getSearchEntries(search: string) {
    return this.http.get<GetEntriesResponse[]>(`${this.BASE_URL}/entry/get-search-entries`, {
      params: {
        search,
      },
    });
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
}
