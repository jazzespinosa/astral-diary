import { Injectable, signal } from '@angular/core';
import { DecryptedDocument, PaginatedSearchResult } from 'app/models/entry.models';

@Injectable({
  providedIn: 'root',
})
export class SearchEntryService {
  private readonly _fullSearchResult = signal<DecryptedDocument[]>([]);
  readonly fullSearchResult = this._fullSearchResult.asReadonly();
  setFullSearchResult(fullSearchResult: DecryptedDocument[]) {
    this._fullSearchResult.set(fullSearchResult);
  }

  clientSideSearch(q: string | null): DecryptedDocument[] {
    if (!q || !this.fullSearchResult().length) {
      return this.fullSearchResult();
    }

    const qLower = q.toLowerCase();
    const filteredItems = this.fullSearchResult().filter(
      (item) =>
        item.title.toLowerCase().includes(qLower) || item.content.toLowerCase().includes(qLower),
    );

    return filteredItems;
  }

  paginateResult(
    entries: DecryptedDocument[],
    page: number,
    pageRows: number,
  ): PaginatedSearchResult {
    let items: DecryptedDocument[] = [];
    const start = Math.floor((page - 1) * pageRows);
    const end = start + pageRows;

    if (entries.length <= pageRows) items = entries;
    else items = entries.slice(start, end);

    return {
      items,
      page,
      pageSize: pageRows,
      totalCount: entries.length,
      totalPages: Math.ceil(entries.length / pageRows),
    };
  }
}
