import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { formatDate } from '@angular/common';
import { environment } from 'environments/environment';
import {
  DecryptedDocument,
  EncryptedDocument,
  EntrySearchQueryParam,
  GetCountResponse,
  EntryIdObj,
  GetUserMoodMapResponse,
  SearchEntriesResponse,
  UpdatePublishResponse,
  PaginatedSearchResult,
} from 'app/models/entry.models';
import { GetUserInfoResponse } from 'app/models/auth.models';
import { map, Observable, of, switchMap, tap } from 'rxjs';
import { EncryptionService } from './encryption.service';
import { RouteReuseStrategy } from '@angular/router';
import { CustomReuseStrategy } from 'app/strategies/custom-reuse-strategy';
import { CachingService } from './caching.service';
import { FeedbackRequest, FeedbackResponse } from 'app/models/feedback.model';

@Injectable({
  providedIn: 'root',
})
export class ApiClientService {
  private http = inject(HttpClient);
  private encryptionService = inject(EncryptionService);
  private routeStrategy = inject(RouteReuseStrategy);
  private cachingService = inject(CachingService);

  private readonly BASE_URL = environment.backendUrl;

  getUserInfo(date: Date): Observable<GetUserInfoResponse> {
    return this.http.get<GetUserInfoResponse>(`${this.BASE_URL}/user/get-user-info`, {
      params: {
        currentDate: formatDate(date, 'yyyy-MM-dd', 'en-US'),
      },
    });
  }

  getUserMoodMap(year: number): Observable<GetUserMoodMapResponse[]> {
    return this.http.get<GetUserMoodMapResponse[]>(`${this.BASE_URL}/user/get-mood-map`, {
      params: {
        year: year,
      },
    });
  }

  saveUserAvatar(avatar: string): Observable<{ avatar: string }> {
    return this.http.patch<{ avatar: string }>(`${this.BASE_URL}/user/save-avatar`, { avatar });
  }

  createEntry(formData: FormData) {
    return this.http
      .post(`${this.BASE_URL}/entry/create`, formData, { observe: 'response' })
      .pipe(tap(() => this.clearRouteCache(['search'])));
  }

  createDraft(formData: FormData) {
    return this.http
      .post(`${this.BASE_URL}/draft/create`, formData)
      .pipe(tap(() => this.clearRouteCache(['drafts'])));
  }

  publishDraft(draftId: string, formData: FormData): Observable<UpdatePublishResponse> {
    return this.http
      .post<UpdatePublishResponse>(`${this.BASE_URL}/draft/publish/${draftId}`, formData)
      .pipe(
        tap(() => {
          this.clearRouteCache(['search', 'drafts']);
          this.cachingService.clearSingleCache(draftId);
        }),
      );
  }

  getAllDrafts(): Observable<DecryptedDocument[]> {
    return this.http.get<EncryptedDocument[]>(`${this.BASE_URL}/draft/get-all`).pipe(
      switchMap(async (drafts) => {
        const decryptedDrafts: DecryptedDocument[] = await Promise.all(
          drafts.map(async (draft) => {
            return this.mapEncryptedDocument(draft);
          }),
        );

        return decryptedDrafts;
      }),
    );
  }

  getRecentEntries(): Observable<DecryptedDocument[]> {
    return this.http.get<EncryptedDocument[]>(`${this.BASE_URL}/entry/get-recent-entries`).pipe(
      switchMap(async (entries) => {
        const decryptedEntries: DecryptedDocument[] = await Promise.all(
          entries.map(async (entry) => {
            return this.mapEncryptedDocument(entry);
          }),
        );

        return decryptedEntries;
      }),
    );
  }

  getSearchEntries(searchParams: EntrySearchQueryParam): Observable<DecryptedDocument[]> {
    return this.http
      .get<SearchEntriesResponse>(`${this.BASE_URL}/entry/get-search-entries`, {
        params: {
          dateFilter: searchParams.filter,
          date: searchParams.date ? formatDate(searchParams.date, 'yyyy-MM-dd', 'en-US') : '',
          mood: searchParams.mood ?? '',
          sort: searchParams.sort,
        },
      })
      .pipe(
        switchMap(async (response) => {
          const decryptedItems: DecryptedDocument[] = await Promise.all(
            response.items.map(async (entry) => {
              return this.mapEncryptedDocument(entry);
            }),
          );

          return decryptedItems;
        }),
      );
  }

  getEntryIds() {
    return this.http.get<EntryIdObj[]>(`${this.BASE_URL}/entry/get/entry-ids`);
  }

  getEntry(entryId: string): Observable<DecryptedDocument> {
    const cachedEntry = this.cachingService.getDocumentCache(entryId);
    if (cachedEntry) {
      return of(cachedEntry);
    }

    return this.http.get<EncryptedDocument>(`${this.BASE_URL}/entry/get/${entryId}`).pipe(
      switchMap(async (entry) => {
        return this.mapEncryptedDocument(entry);
      }),
      tap((entry) => this.cachingService.setDocumentCache(entryId, entry)),
    );
  }

  getDraft(draftId: string): Observable<DecryptedDocument> {
    const cachedDraft = this.cachingService.getDocumentCache(draftId);
    if (cachedDraft) {
      return of(cachedDraft);
    }

    return this.http.get<EncryptedDocument>(`${this.BASE_URL}/draft/get/${draftId}`).pipe(
      switchMap(async (draft) => {
        return this.mapEncryptedDocument(draft);
      }),
      tap((draft) => this.cachingService.setDocumentCache(draftId, draft)),
    );
  }

  getAttachmentFile(
    entityId: string,
    attachmentType: 'thumbnail' | 'attachment',
    attachmentId: string,
  ): Observable<Blob> {
    return this.http.get(
      `${this.BASE_URL}/attachment/get/${entityId}/${attachmentType}/${attachmentId}`,
      {
        responseType: 'blob',
      },
    );
  }

  checkEntryLimit(): Observable<GetCountResponse> {
    return this.http.get<GetCountResponse>(`${this.BASE_URL}/entry/check-limit`);
  }

  countUserDrafts(): Observable<GetCountResponse> {
    return this.http.get<GetCountResponse>(`${this.BASE_URL}/draft/count`);
  }

  getCalendarEntries(date: Date): Observable<DecryptedDocument[]> {
    const formattedDate = formatDate(date, 'yyyy-MM-dd', 'en-US');
    return this.http
      .get<EncryptedDocument[]>(`${this.BASE_URL}/entry/get-calendar-entries`, {
        params: {
          date: formattedDate,
        },
      })
      .pipe(
        switchMap(async (entries) => {
          const decryptedEntries: DecryptedDocument[] = await Promise.all(
            entries.map(async (entry) => {
              return this.mapEncryptedDocument(entry);
            }),
          );

          return decryptedEntries;
        }),
      );
  }

  updateEntry(entryId: string, formData: FormData): Observable<UpdatePublishResponse> {
    return this.http
      .put<UpdatePublishResponse>(`${this.BASE_URL}/entry/update/${entryId}`, formData)
      .pipe(
        tap(() => {
          this.clearRouteCache(['search']);
          this.cachingService.clearSingleCache(entryId);
        }),
      );
  }

  updateDraft(draftId: string, formData: FormData): Observable<UpdatePublishResponse> {
    return this.http
      .put<UpdatePublishResponse>(`${this.BASE_URL}/draft/update/${draftId}`, formData)
      .pipe(
        tap(() => {
          this.clearRouteCache(['drafts']);
          this.cachingService.clearSingleCache(draftId);
        }),
      );
  }

  deleteEntry(entryId: string) {
    return this.http.delete(`${this.BASE_URL}/entry/delete/${entryId}`).pipe(
      tap(() => {
        this.clearRouteCache(['search']);
        this.cachingService.clearSingleCache(entryId);
      }),
    );
  }

  deleteDraft(draftId: string) {
    return this.http.delete(`${this.BASE_URL}/draft/delete/${draftId}`).pipe(
      tap(() => {
        this.clearRouteCache(['drafts']);
        this.cachingService.clearSingleCache(draftId);
      }),
    );
  }

  getDeletedEntries(): Observable<DecryptedDocument[]> {
    return this.http.get<EncryptedDocument[]>(`${this.BASE_URL}/entry/get-deleted-entries`).pipe(
      switchMap(async (entries) => {
        const decryptedEntries: DecryptedDocument[] = await Promise.all(
          entries.map(async (entry) => {
            return this.mapEncryptedDocument(entry);
          }),
        );

        return decryptedEntries;
      }),
    );
  }

  restoreDeletedEntries(entryIds: string[]) {
    return this.http
      .put<{ result: boolean; message: string }>(`${this.BASE_URL}/entry/restore`, entryIds)
      .pipe(
        tap(() => {
          this.clearRouteCache(['search']);
          entryIds.forEach((entryId) => this.cachingService.clearSingleCache(entryId));
        }),
      );
  }

  private async mapEncryptedDocument(document: EncryptedDocument): Promise<DecryptedDocument> {
    const decryptedContent = await this.encryptionService.decrypt({
      ciphertext: document.encryptedContent,
      iv: document.contentIv,
      salt: document.contentSalt,
    });

    return {
      id: document.id,
      type: document.type.toLowerCase() as 'entry' | 'draft',
      date: new Date(document.date),
      mood: document.mood,
      title: decryptedContent.title,
      content: decryptedContent.content,
      attachmentId: document.attachmentId ?? null,
      attachmentHash: document.attachmentHash ?? null,
      createdAt: new Date(document.createdAt),
      modifiedAt: new Date(document.modifiedAt),
      deletedAt: document.deletedAt ? new Date(document.deletedAt) : null,
      publishedAt: document.publishedAt ? new Date(document.publishedAt) : null,
    };
  }

  private clearRouteCache(routes: string[]) {
    const strategy = this.routeStrategy as CustomReuseStrategy;
    routes.forEach((route) => strategy.clearSavedRoute(route));
  }

  submitFeedback(feedback: FeedbackRequest) {
    return this.http.post<FeedbackResponse>(`${this.BASE_URL}/utility/feedback`, feedback);
  }
}
