import {
  AfterViewInit,
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
  CalendarView,
  CalendarDatePipe,
  CalendarMonthViewDay,
} from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { EntryComponent } from 'app/shared/components/entry/entry.component';
import { GeneralAppService } from 'app/services/general-app.service';
import { DatePipe, NgClass } from '@angular/common';
import { isSameDay, startOfDay } from 'date-fns';
import { map, Subject, tap } from 'rxjs';
import { ApiClientService } from 'app/services/api-client.service';
import { AttachmentObjResponse } from 'app/models/entry.models';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-calendar',
  imports: [
    CalendarPreviousViewDirective,
    CalendarTodayDirective,
    CalendarNextViewDirective,
    CalendarMonthViewComponent,
    CalendarDatePipe,
    ButtonModule,
    ConfirmDialogModule,
    EntryComponent,
    DatePipe,
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
  // inject dependencies
  protected appService = inject(GeneralAppService);
  private entryService = inject(ApiClientService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private confirmationService = inject(ConfirmationService);

  readonly CalendarView = CalendarView;
  visibleDialog = signal<boolean>(false);
  refresh = new Subject<void>();

  selectedMonthViewDay = signal<CalendarMonthViewDay | null>(null);
  selectedDate = signal<Date | null>(null);
  todayDate = signal(new Date()); // displayed month

  access = signal<'new' | 'view' | 'edit'>('new');
  values = signal({
    date: new Date(),
    title: '',
    content: '',
  });
  sourceId = signal<string | null>(null);
  attachments = signal<AttachmentObjResponse[]>([]);

  events = signal<CalendarEvent[]>([]);
  selectedEntries = signal<CalendarEvent[]>([]);
  selectedEntry = signal<CalendarEvent | null>(null);

  constructor() {
    effect(() => {
      this.onMonthChange();
    });
  }

  ngOnInit(): void {
    this.selectDateProgrammatically(new Date());

    this.appService.refreshCalendarEvents.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.onMonthChange();
      },
    });
  }

  private onMonthChange() {
    this.entryService.getCalendarEntries(this.todayDate()).subscribe((response) => {
      this.events.set(
        response.map((entry) => ({
          entryId: entry.entryId,
          start: startOfDay(new Date(entry.date)),
          title: entry.title,
          content: entry.content,
          attachments: entry.attachments,
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
    this.access.set('new');
    this.updateEntryValues(day.date, '', '');
    this.appService.setIsEntryOpen(true);
    this.selectDateProgrammatically(day.date);
  }

  viewEntry(entry: any) {
    this.sourceId.set(entry.entryId);
    this.attachments.set(entry.attachments);
    this.access.set('view');
    this.updateEntryValues(entry.start, entry.title, entry.content);
    this.appService.setIsEntryOpen(true);
  }

  editEntry(entry: any) {
    this.router.navigate(['/entry/edit/', entry.entryId]);
  }

  deleteEntry(entry: any) {
    this.confirmationService.confirm({
      target: entry.target as EventTarget,
      message:
        '<span class="fw-semibold">Do you want to delete this entry?</span> <br /><br />' +
        entry.title,
      header: 'Confirm Delete',
      icon: 'fa-solid fa-circle-exclamation',
      dismissableMask: true,
      rejectLabel: 'Cancel',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Delete',
        severity: 'danger',
      },

      accept: () => {
        this.entryService.deleteEntry(entry.entryId).subscribe({
          next: () => {
            this.onMonthChange();
          },
        });

        this.appService.setToastMessage({
          severity: 'success',
          summary: 'Confirmed',
          detail: 'Record deleted',
        });
      },
      reject: () => {
        // this.appService.setToastMessage({
        //   severity: 'error',
        //   summary: 'Rejected',
        //   detail: 'You have rejected',
        // });
      },
    });
  }

  private updateEntryValues(date: Date, title: string, content: string) {
    this.values.set({
      date,
      title,
      content,
    });
  }

  clearSelectedDay() {
    this.selectedDate.set(null);
    this.refresh.next();
  }

  beforeMonthViewRender({ body }: { body: CalendarMonthViewDay[] }): void {
    const selected = this.selectedDate();
    let foundSelectedDay = false;

    body.forEach((day) => {
      if (selected && isSameDay(day.date, selected)) {
        day.cssClass = 'cal-day-selected';
        this.selectedMonthViewDay.set(day);
        this.selectedEntries.set(this.events().filter((event) => isSameDay(event.start, day.date)));
        foundSelectedDay = true;
      } else {
        delete day.cssClass;
      }
    });

    if (!foundSelectedDay) {
      this.selectedMonthViewDay.set(null);
    }
  }

  selectDateProgrammatically(date: Date) {
    this.selectedDate.set(date);
    this.refresh.next();
  }

  entryClicked(entry: any) {
    this.selectedEntry.set(entry);
  }
}
