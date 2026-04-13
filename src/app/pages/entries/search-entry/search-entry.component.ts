import {
  Component,
  computed,
  effect,
  inject,
  model,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { PanelModule } from 'primeng/panel';
import { ApiClientService } from 'app/services/api-client.service';
import {
  DateFilter,
  DecryptedDocument,
  EntrySearchQueryParam,
  PaginatedSearchResult,
  Sort,
} from 'app/models/entry.models';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { formatDate } from '@angular/common';
import { CardComponent } from 'app/shared/components/card/card.component';
import { LoadingComponent } from 'app/shared/components/loading/loading.component';
import { MOODS } from 'app/shared/components/mood-rating/mood-rating.component';
import { firstValueFrom } from 'rxjs';
import { SearchEntryService } from 'app/services/search-entry.service';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

const DATE_FILTER_OPTIONS = [
  { label: 'Any', value: 'any' as DateFilter },
  { label: 'Exact', value: 'exact' as DateFilter },
  { label: 'Before', value: 'before' as DateFilter },
  { label: 'After', value: 'after' as DateFilter },
];

const MOOD_FILTER_OPTIONS = [
  { label: 'Any', value: null },
  ...MOODS,
  { label: 'Unrated', value: 0 },
];

const PAGE_ROWS = 20;

@Component({
  selector: 'app-search-entry',
  imports: [
    ButtonModule,
    InputTextModule,
    CardModule,
    RadioButtonModule,
    FormsModule,
    SelectModule,
    DatePickerModule,
    ReactiveFormsModule,
    CardComponent,
    LoadingComponent,
    PaginatorModule,
    RouterLink,
    PanelModule,
    ToggleSwitchModule,
  ],
  templateUrl: './search-entry.component.html',
  styleUrl: './search-entry.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class SearchEntryComponent {
  private formBuilder = inject(FormBuilder);
  private apiClientService = inject(ApiClientService);
  private searchEntryService = inject(SearchEntryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  searchForm = this.formBuilder.group({
    searchValue: [''],
  });

  searchedValue = signal<string>('');
  searchLabel = computed(() => {
    if (this.searched()) {
      const filter = this.queryParams().get('filter');
      const mood = this.queryParams().get('mood');
      if (
        (!this.searchedValue() || this.searchedValue() === '') &&
        (filter === 'any' || filter === null) &&
        mood === null
      ) {
        return 'All entries';
      }
      return `Search results for "${this.searchedValue() ?? ''}"`;
    }
    return 'Recent Entries';
  });

  displayFilterPanel = false;
  compactView = model<boolean>(false);
  selectedSort = model<Sort>('desc');
  dateFilterOptions = DATE_FILTER_OPTIONS;
  selectedDateFilter = model<DateFilter>('any');
  selectedDate = model<Date>(new Date());

  moodFilterOptions = MOOD_FILTER_OPTIONS;
  selectedMoodFilter = model<number | null>(null);

  displaySearchResult = signal<PaginatedSearchResult>({
    items: [],
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
  });
  recentEntries = signal<DecryptedDocument[]>([]);

  searched = signal<boolean>(false);
  isLoading = signal<boolean>(false);

  queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  currentPage = signal<number>(1);
  currentFirst = computed(() => {
    return (this.currentPage() - 1) * this.pageRows;
  });
  currentLast = computed(() => {
    return this.currentFirst() + this.displaySearchResult().items.length;
  });
  readonly pageRows = PAGE_ROWS;

  constructor() {
    effect(() => {
      const params = this.queryParams();
      const q = params.get('q');
      const filter = params.get('filter')?.toLowerCase() ?? null;
      const date = params.get('date') ?? null;
      const mood = params.get('mood') ?? null;
      const sort = params.get('sort')?.toLowerCase() ?? null;

      if (q === null && !filter && !date && !mood && !sort) {
        this.searched.set(false);
        this.searchForm.reset();
        this.getRecentEntries();
        return;
      }

      const validSort: Sort = this.isValidSort(sort) ? (sort as Sort) : 'desc';

      let validFilter: DateFilter;
      let validDate: string | null;
      let validMood: number | null;

      if (this.isNonAnyDateFilter(filter)) {
        if (this.isValidDate(date)) {
          validFilter = filter as DateFilter;
          validDate = date!;
        } else {
          validFilter = 'any';
          validDate = null;
        }
      } else {
        validFilter = 'any';
        validDate = null;
      }

      if (mood === null) validMood = null;
      else if (this.isValidMood(mood)) validMood = Number(mood);
      else validMood = null;

      const corrections: Record<string, string | null> = {};

      if (filter !== null && filter !== validFilter) {
        corrections['filter'] = validFilter;
      }
      if (sort !== null && sort !== validSort) {
        corrections['sort'] = validSort;
      }
      if (date !== null && date !== validDate) {
        corrections['date'] = validDate;
      }
      if (mood !== null && mood !== validMood?.toString()) {
        corrections['mood'] = null;
      }

      if (Object.keys(corrections).length > 0) {
        this.router.navigate([], {
          queryParams: corrections,
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
        return;
      }

      this.searched.set(true);
      this.selectedSort.set(validSort);
      this.selectedDateFilter.set(validFilter);
      this.selectedMoodFilter.set(validMood);
      this.searchForm.get('searchValue')?.setValue(q);
      this.searchedValue.set(q!);
      if (validDate) {
        this.selectedDate.set(new Date(validDate));
      }

      this.searchEntries({
        q,
        filter: validFilter,
        date: validDate ? new Date(validDate) : null,
        mood: validMood,
        sort: validSort,
      });
    });

    const compactView = localStorage.getItem('compactView');
    if (compactView) {
      this.compactView.set(compactView === 'true');
    }
  }

  onSearchClicked() {
    this.searched.set(true);

    const searchValue = this.searchForm.value.searchValue;
    const filter = this.selectedDateFilter();
    this.router.navigate(['entry/search'], {
      queryParams: {
        q: searchValue,
        filter: filter,
        date: filter !== 'any' ? this.formattedDate(this.selectedDate()) : null,
        mood: this.selectedMoodFilter(),
        sort: this.selectedSort(),
        sid: crypto.randomUUID(), // Search ID to trigger search effect
      },
      queryParamsHandling: 'merge',
    });
  }

  private async searchEntries(params: EntrySearchQueryParam) {
    this.isLoading.set(true);

    try {
      const fullResult = await firstValueFrom(this.apiClientService.getSearchEntries(params));
      this.searchEntryService.setFullSearchResult(fullResult);

      const processedResult = this.processSearchResult(params.q, 1);
      this.currentPage.set(1);
      this.displaySearchResult.set(processedResult);
    } catch (error) {
      console.error(error);
    } finally {
      if (this.selectedDateFilter() === 'any' && this.selectedMoodFilter() === null) {
        this.displayFilterPanel = false;
      } else {
        this.displayFilterPanel = true;
      }
      this.isLoading.set(false);
    }
  }

  onPageChange(event: PaginatorState, results: Element) {
    const page = Math.floor((event.first ?? 0) / (event.rows ?? 20)) + 1;
    const processedResult = this.processSearchResult(this.searchedValue(), page);
    this.displaySearchResult.set(processedResult);
    this.currentPage.set(page);
    results.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  private processSearchResult(q: string | null, page: number): PaginatedSearchResult {
    const filteredResult = this.searchEntryService.clientSideSearch(q);
    const paginatedResult = this.searchEntryService.paginateResult(
      filteredResult,
      page,
      this.pageRows,
    );

    return paginatedResult;
  }

  private async getRecentEntries() {
    this.isLoading.set(true);

    try {
      const entriesResponse = await firstValueFrom(this.apiClientService.getRecentEntries());
      this.recentEntries.set(entriesResponse);
    } catch (error) {
      console.error(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private isNonAnyDateFilter(value: string | null): boolean {
    if (!value || value === 'any') return false;
    const validNonAny = this.dateFilterOptions.map((options) => options.value);
    return validNonAny.includes(value as DateFilter);
  }

  private isValidDate(value: string | null): boolean {
    if (!value) return false;
    return /^(19[0-9][0-9]|20[0-9][0-9])-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(value); // 1900-2099
  }

  private isValidMood(value: string): boolean {
    return /^[0-5]$/.test(value); // 0-5
  }

  private isValidSort(value: string | null): boolean {
    if (!value) return false;
    return ['asc', 'desc'].includes(value as Sort);
  }

  private formattedDate(date: Date) {
    return formatDate(date, 'yyyy-MM-dd', 'en-US');
  }

  resetFilters() {
    this.selectedMoodFilter.set(null);
    this.selectedDateFilter.set('any');
    this.selectedDate.set(new Date());
    this.selectedSort.set('desc');
  }

  onCompactViewChange() {
    localStorage.setItem('compactView', this.compactView().toString());
  }
}
