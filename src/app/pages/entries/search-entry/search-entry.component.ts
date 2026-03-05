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
import { EntryService } from 'app/services/entry.service';
import { EntryQueryParams, GetEntriesResponse } from 'app/models/entry.models';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DatePipe, formatDate } from '@angular/common';
import { distinctUntilChanged, map, switchMap } from 'rxjs';

type CaseInsensitive<T extends string> =
  | T
  | Uppercase<T>
  | Lowercase<T>
  | Capitalize<T>
  | Uncapitalize<T>;
type DateFilter = CaseInsensitive<'any' | 'exact' | 'before' | 'after'>;
type Sort = CaseInsensitive<'asc' | 'desc'>;

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
    DatePipe,
  ],
  templateUrl: './search-entry.component.html',
  styleUrl: './search-entry.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class SearchEntryComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private entryService = inject(EntryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  searchForm = this.formBuilder.group({
    searchValue: [''],
  });

  selectedSort = model<Sort>('desc');
  dateFilterOptions = [
    { label: 'Any', value: 'any' as DateFilter },
    { label: 'Exact', value: 'exact' as DateFilter },
    { label: 'Before', value: 'before' as DateFilter },
    { label: 'After', value: 'after' as DateFilter },
  ];
  selectedDateFilter = model<DateFilter>('any');
  selectedDate = model<Date>(new Date());
  entriesSearchResult = signal<GetEntriesResponse[]>([]);
  displayedResults = signal<GetEntriesResponse[]>([]);
  recentEntries = signal<GetEntriesResponse[]>([]);

  searchClicked = signal<boolean>(false);

  queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  q = computed(() => this.queryParams().get('q') ?? '');

  filter = computed(() => {
    const filter = this.queryParams().get('filter')?.toLowerCase() ?? null;
    return this.isValidDateFilter(filter) ? (filter as DateFilter) : 'any';
  });

  date = computed(() => {
    const date = this.queryParams().get('date');
    return this.isValidDate(date) ? new Date(date!) : new Date();
  });

  sort = computed(() => {
    const sort = this.queryParams().get('sort')?.toLowerCase() ?? null;
    return this.isValidSort(sort) ? (sort as Sort) : 'desc';
  });

  searchQuery = computed(() => ({
    q: this.q(),
    filter: this.filter(),
    date: this.date(),
    sort: this.sort(),
  }));

  constructor() {
    // effect(() => {
    //   const sort = this.xSort();

    //   if (sort) {
    //     console.log('Sort changed:', sort);
    //     // this.loadData();
    //   }
    // });

    // effect(() => {
    //   const sort = this.sort();
    //   // this.sortEntries(sort); // local sorting only
    //   console.log('Sort changed:', sort);
    // });

    effect(() => {
      const query = this.searchQuery();
      console.log('Search query:', query);

      if (!query.q || query.q === '') {
        console.log('No search query');
        this.searchClicked.set(false);
        this.getRecentEntries();
        return;
      }

      this.searchClicked.set(true);
      this.searchForm.get('searchValue')?.setValue(query.q);
      this.selectedDateFilter.set(query.filter);
      // this.selectedDate.set(this.isValidDate(query.date) ? new Date(query.date) : new Date());
      this.selectedDate.set(query.date);
      this.selectedSort.set(query.sort);

      this.searchEntries();
    });
  }

  ngOnInit(): void {}
  // ngOnInit(): void {
  //   // const queryParams = this.route.snapshot.queryParamMap;
  //   // this.lastSearchQuery.set({
  //   //   q: queryParams.get('q') || '',
  //   //   filter: (queryParams.get('filter') as DateFilter) || 'Any',
  //   //   date: queryParams.get('date') ? new Date(queryParams.get('date')!) : null,
  //   //   sort: (queryParams.get('sort') as Sort) || 'desc',
  //   // });

  //   // console.log(this.lastSearchQuery());

  //   // this.route.queryParams
  //   //   .pipe(
  //   //     map((params) => params['sort']),
  //   //     distinctUntilChanged(),
  //   //   )
  //   //   .subscribe((sort) => {
  //   //     console.log('Sort changed:', sort);
  //   //     // this.loadData();

  //   //     return;
  //   //   });

  //   this.route.queryParamMap
  //     .pipe(
  //       map((params) => params.get('sort')),
  //       distinctUntilChanged(),
  //       switchMap((sort) => {
  //         console.log('Sort changed:', sort);
  //         return this.route.queryParamMap;
  //       }),
  //       takeUntilDestroyed(this.destroyRef),
  //     )
  //     .subscribe((params) => {
  //       if (params.get('q') === null || params.get('q') === '') {
  //         this.searchClicked.set(false); // fix search click logic
  //         this.resetQueryParams();
  //         this.getRecentEntries();
  //         return;
  //       }

  //       this.searchClicked.set(true);
  //       this.searchForm.get('searchValue')?.setValue(params.get('q'));
  //       const dateFilter = params.get('filter')?.toLowerCase() ?? null;
  //       const date = params.get('date');
  //       const sort = params.get('sort')?.toLowerCase() ?? null;

  //       this.selectedDateFilter.set(
  //         this.isValidDateFilter(dateFilter) ? (dateFilter as DateFilter) : 'any',
  //       );
  //       this.selectedDate.set(this.isValidDate(date) ? new Date(date!) : new Date());

  //       if (this.sort() !== sort) {
  //         this.sort.set(this.isValidSort(sort) ? (sort as Sort) : 'desc');
  //       }
  //       this.searchEntries();
  //     });

  //   // this.entryService.getEntriesAll().subscribe((entriesResponse) => {
  //   //   this.entriesSearchResult.set(entriesResponse);
  //   // });
  // }

  onSearchClicked() {
    const searchValue = this.searchForm.value.searchValue;
    if (searchValue && searchValue !== '') {
      const filter = this.selectedDateFilter();
      this.router.navigate(['entry/search'], {
        queryParams: {
          q: searchValue,
          filter: filter,
          date: filter !== 'any' ? this.formattedDate(this.selectedDate()) : null,
          sort: this.sort(),
        },
        queryParamsHandling: 'merge',
      });
    } else {
      this.searchClicked.set(false);
      this.resetQueryParams();
    }
  }

  onEntryClick(entry: GetEntriesResponse) {
    console.log(entry);
    const entryQueryParams: EntryQueryParams = {
      mode: 'view',
    };
    this.router.navigate(['entry/view', entry.entryId], { queryParams: entryQueryParams });
  }

  onChangeSort(sort: Sort) {
    this.selectedSort.set(sort);
    this.router.navigate([], {
      // relativeTo: this.route,
      queryParams: {
        sort: sort,
      },
      queryParamsHandling: 'merge',
    });
  }

  private applySort(sort: Sort) {
    this.displayedResults.set(
      [...this.entriesSearchResult()].sort((a, b) => {
        return sort === 'asc' ? (a.date > b.date ? 1 : -1) : a.date < b.date ? 1 : -1;
      }),
    );
  }

  private searchEntries() {
    this.entryService
      .getSearchEntries(this.searchForm.value.searchValue!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entriesResponse) => {
          this.entriesSearchResult.set(entriesResponse);
        },
        error: (error) => {
          console.error(error);
        },
      });
  }

  private getRecentEntries() {
    this.entryService
      .getRecentEntries()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((entriesResponse) => {
        this.recentEntries.set(entriesResponse);
      });
  }

  private isValidDateFilter(value: string | null) {
    if (!value) return false;
    if (
      !this.dateFilterOptions.map((option) => option.value).includes(value as DateFilter) ||
      value === 'any'
    ) {
      this.router.navigate([], {
        queryParams: { filter: 'any', date: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      return false;
    }
    return true;
  }

  private isValidDate(value: string | null) {
    if (!value) return false;
    const isValidDate =
      /^(19[0-9][0-9]|20[0-9][0-9])-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(value); // 1900-2099
    if (!isValidDate) {
      this.router.navigate([], {
        queryParams: { filter: 'any', date: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      return false;
    }
    return true;
  }

  private isValidSort(value: string | null) {
    if (!value) return false;
    if (!['asc', 'desc'].includes(value as Sort)) {
      this.router.navigate([], {
        queryParams: { sort: 'desc' },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      return false;
    }
    return true;
  }

  private resetQueryParams() {
    this.router.navigate([], {
      queryParams: {},
      queryParamsHandling: 'replace',
      replaceUrl: true,
    });
  }

  private formattedDate(date: Date) {
    return formatDate(date, 'yyyy-MM-dd', 'en-US');
  }
}
