import {
  Component,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import {
  DateAdapter,
  provideCalendar,
  CalendarPreviousViewDirective,
  CalendarTodayDirective,
  CalendarNextViewDirective,
  CalendarMonthViewComponent,
  CalendarEvent,
  CalendarDatePipe,
  CalendarMonthViewDay,
} from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { ButtonModule } from 'primeng/button';
import { EntryComponent } from 'app/shared/components/entry/entry.component';
import { GeneralAppService } from 'app/services/general-app.service';
import { CommonModule, DatePipe } from '@angular/common';
import { isAfter, isSameDay, startOfDay } from 'date-fns';
import { Subject } from 'rxjs';
import { ApiClientService } from 'app/services/api-client.service';
import { DecryptedDocument, EntryAccess } from 'app/models/entry.models';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EntryService } from 'app/services/entry.service';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-calendar',
  imports: [
    CommonModule,
    FormsModule,
    CalendarPreviousViewDirective,
    CalendarTodayDirective,
    CalendarNextViewDirective,
    CalendarMonthViewComponent,
    CalendarDatePipe,
    ButtonModule,
    EntryComponent,
    DatePipe,
    DatePickerModule,
  ],
  providers: [
    provideCalendar({
      provide: DateAdapter,
      useFactory: adapterFactory,
    }),
  ],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class CalendarComponent implements OnInit {
  protected generalAppService = inject(GeneralAppService);
  private apiClientService = inject(ApiClientService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private entryService = inject(EntryService);

  refresh = new Subject<void>();

  date: Date[] | undefined;
  selectedDate = signal<Date | null>(null);
  displayMonth = signal(new Date());

  document = signal<DecryptedDocument | null>(null);
  access = signal<EntryAccess>('new');

  events = signal<CalendarEvent[]>([]);
  selectedCalendarDateEntries = signal<CalendarEvent[]>([]);
  selectedEntry = signal<CalendarEvent | null>(null);

  constructor() {
    effect(() => {
      this.onMonthChange();
    });
  }

  ngOnInit(): void {
    this.selectedDate.set(new Date());
    this.refresh.next();

    this.generalAppService.refreshCalendarEvents
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.onMonthChange();
        },
      });
  }

  private onMonthChange() {
    this.apiClientService
      .getCalendarEntries(this.displayMonth())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.events.set(
          response.map((entry) => ({
            id: entry.id,
            start: startOfDay(new Date(entry.date)),
            title: entry.title,
            content: entry.content,
            mood: entry.mood,
            meta: { document: entry },
            attachmentId: entry.attachmentId,
          })),
        );
      });
  }

  dayClicked(day: CalendarMonthViewDay): void {
    if (this.selectedDate() && isSameDay(this.selectedDate()!, day.date)) {
      this.selectedDate.set(null);
    } else {
      this.selectedDate.set(day.date);
    }
    this.refresh.next();
  }

  addEntry(day: CalendarMonthViewDay) {
    this.document.set(null);
    this.access.set('new');
    this.generalAppService.setIsEntryOpen(true);
    this.dayClicked(day);
  }

  viewEntry(entry: any) {
    this.document.set(entry.meta.document);
    this.access.set('view');
    this.generalAppService.setIsEntryOpen(true);
  }

  editEntry(entry: any) {
    this.router.navigate(['/entry/edit/', entry.id]);
  }

  async deleteEntry(entry: any) {
    const response = await this.entryService.onDelete({
      entityId: entry.id,
      title: entry.title,
    });
    if (response) {
      this.onMonthChange();
    }
  }

  clearSelectedDay() {
    this.selectedDate.set(null);
    this.refresh.next();
  }

  beforeMonthViewRender({ body }: { body: CalendarMonthViewDay[] }): void {
    const selected = this.selectedDate();
    let activeSelectedDay = false;

    body.forEach((day) => {
      if (selected && isSameDay(day.date, selected)) {
        day.cssClass = 'cal-day-selected';
        this.selectedDate.set(day.date);
        this.selectedCalendarDateEntries.set(
          this.events().filter((event) => isSameDay(event.start, day.date)),
        );
        activeSelectedDay = true;
      } else {
        delete day.cssClass;
      }
    });

    if (!activeSelectedDay) {
      this.selectedDate.set(null);
    }
  }

  entryClicked(entry: any) {
    this.selectedEntry.set(entry);
  }
}
