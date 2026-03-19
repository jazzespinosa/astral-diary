import {
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  model,
  OnInit,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { RadioButtonModule } from 'primeng/radiobutton';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ApiClientService } from 'app/services/api-client.service';
import {
  DateFilter,
  EntrySearchQueryParam,
  GetEntryResponse,
  GetSearchEntriesResponse,
  Sort,
} from 'app/models/entry.models';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AsyncPipe, DatePipe, formatDate } from '@angular/common';
import { distinctUntilChanged, map, switchMap } from 'rxjs';
import { GetImagePipe } from 'app/shared/pipes/get-image.pipe';
import { CardComponent } from 'app/shared/components/card/card.component';
import { LoadingComponent } from 'app/shared/components/loading/loading.component';

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
  ],
  templateUrl: './search-entry.component.html',
  styleUrl: './search-entry.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class SearchEntryComponent {
  private formBuilder = inject(FormBuilder);
  private entryService = inject(ApiClientService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  searchForm = this.formBuilder.group({
    searchValue: [''],
  });

  searchedValue = signal<string>('');

  selectedSort = model<Sort>('desc');
  dateFilterOptions = [
    { label: 'Any', value: 'any' as DateFilter },
    { label: 'Exact', value: 'exact' as DateFilter },
    { label: 'Before', value: 'before' as DateFilter },
    { label: 'After', value: 'after' as DateFilter },
  ];
  selectedDateFilter = model<DateFilter>('any');
  selectedDate = model<Date>(new Date());
  fullEntrySearchResult = signal<GetSearchEntriesResponse | null>(null);
  entriesSearchResult = signal<GetEntryResponse[]>([]);
  recentEntries = signal<GetEntryResponse[]>([]);

  searchClicked = signal<boolean>(false);
  isLoading = signal<boolean>(false);

  queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  currentPage = computed(() => {
    const params = this.queryParams();
    return Number(params.get('page') ?? 1);
  });
  currentFirst = computed(() => {
    return (this.currentPage() - 1) * this.pageRows;
  });

  pageRows: number = 20;

  constructor() {
    effect(() => {
      const params = this.queryParams();
      const q = params.get('q');
      const filter = params.get('filter')?.toLowerCase() ?? null;
      const date = params.get('date') ?? null;
      const sort = params.get('sort')?.toLowerCase() ?? null;
      const page = params.get('page') ?? null;

      if (!q && !filter && !date && !sort) {
        this.searchClicked.set(false);
        this.getRecentEntries();
        return;
      }

      const validSort: Sort = this.isValidSort(sort) ? (sort as Sort) : 'desc';

      const validPage = Number(page) > 0 ? Number(page) : 1;

      let validFilter: DateFilter;
      let validDate: string | null;

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
      if (page !== null && Number(page) !== validPage) {
        corrections['page'] = validPage.toString();
      }

      if (Object.keys(corrections).length > 0) {
        this.router.navigate([], {
          queryParams: corrections,
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
        return;
      }

      this.searchClicked.set(true);
      this.selectedSort.set(validSort);
      this.selectedDateFilter.set(validFilter);
      this.searchForm.get('searchValue')?.setValue(q);
      this.searchedValue.set(q!);
      if (validDate) {
        this.selectedDate.set(new Date(validDate));
      }

      this.searchEntries({
        q,
        filter: validFilter,
        date: validDate ? new Date(validDate) : null,
        sort: validSort,
        page: validPage,
      });
    });
  }

  onSearchClicked() {
    this.searchClicked.set(true);

    const searchValue = this.searchForm.value.searchValue;
    const filter = this.selectedDateFilter();
    this.router.navigate(['entry/search'], {
      queryParams: {
        q: searchValue,
        filter: filter,
        date: filter !== 'any' ? this.formattedDate(this.selectedDate()) : null,
        sort: this.selectedSort(),
        page: 1,
        sid: crypto.randomUUID(), // Search ID to trigger search effect
      },
      queryParamsHandling: 'merge',
    });
  }

  private searchEntries(params: EntrySearchQueryParam) {
    this.isLoading.set(true);

    this.entryService
      .getSearchEntries(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entriesResponse) => {
          this.isLoading.set(false);
          this.fullEntrySearchResult.set(entriesResponse);
          this.entriesSearchResult.set(entriesResponse.items);
        },
        error: (error) => {
          this.isLoading.set(false);
          console.error(error);
        },
      });
  }

  private getRecentEntries() {
    this.isLoading.set(true);

    this.entryService
      .getRecentEntries()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entriesResponse) => {
          this.isLoading.set(false);
          this.recentEntries.set(entriesResponse);
        },
        error: (error) => {
          this.isLoading.set(false);
          console.error(error);
        },
      });
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

  private isValidSort(value: string | null): boolean {
    if (!value) return false;
    return ['asc', 'desc'].includes(value as Sort);
  }

  private formattedDate(date: Date) {
    return formatDate(date, 'yyyy-MM-dd', 'en-US');
  }

  onPageChange(event: PaginatorState) {
    const page = Math.floor((event.first ?? 0) / (event.rows ?? 20)) + 1;
    this.router.navigate(['entry/search'], {
      queryParams: {
        page: page,
        sid: crypto.randomUUID(),
      },
      queryParamsHandling: 'merge',
    });
  }
}
