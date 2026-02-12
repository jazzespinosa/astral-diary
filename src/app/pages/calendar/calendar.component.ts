import { Component, inject, signal, ViewEncapsulation } from '@angular/core';
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
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { EntryComponent } from 'app/shared/entry/entry.component';
import { AppService } from 'app/services/app.service';
import { DatePipe, NgClass } from '@angular/common';
import { isSameDay, startOfDay } from 'date-fns';
import { tap } from 'rxjs';

const Events = [
  {
    start: startOfDay(new Date()),
    title:
      'A very long title for an event to test the calendar view. Event 1 - With my current stay in Accenture, I have received 2 Awards, namely Malikhain and Agila Award.',
    content: `id,word_length,word_value
1,4,AAHS
2,4,AALS
3,4,ABAS
4,4,ABBA
5,4,ABBE
6,4,ABED
7,4,ABET
8,4,ABLE
9,4,ABLY
10,4,ABRI
11,4,ABUT
12,4,ABYE
13,4,ABYS
14,4,ACAI
15,4,ACED
16,4,ACES
17,4,ACHE
18,4,ACHY
19,4,ACID
20,4,ACME
21,4,ACNE
22,4,ACRE
23,4,ACRO
24,4,ACTA
25,4,ACTS
26,4,ACYL
27,4,ADDS
28,4,ADIT
29,4,ADOS
30,4,ADZE
31,4,AEON
32,4,AERO
33,4,AERY
34,4,AFAR
35,4,AFRO
36,4,AGAR
37,4,AGAS
38,4,AGED
39,4,AGEE
40,4,AGER`,
  },
  {
    start: startOfDay(new Date('2026-02-07')),
    title: 'Event 2',
    content: 'Content 2',
  },
  {
    start: startOfDay(new Date('2026-02-02')),
    title: 'Event 3',
    content: 'Content 3',
  },
  {
    start: startOfDay(new Date('2026-03-06')),
    title: 'Event 4',
    content: 'Content 4',
  },
  {
    start: startOfDay(new Date('2026-02-19')),
    title: 'Event 5',
    content: 'Content 5',
  },
  {
    start: startOfDay(new Date('2025-12-19')),
    title: 'Event 6',
    content: 'Content 6',
  },
];

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
    ToastModule,
    EntryComponent,
    DatePipe,
  ],
  providers: [
    provideCalendar({
      provide: DateAdapter,
      useFactory: adapterFactory,
    }),
    ConfirmationService,
    MessageService,
  ],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class CalendarComponent {
  // inject dependencies
  protected appService = inject(AppService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  readonly CalendarView = CalendarView;
  visibleDialog = signal<boolean>(false);

  selectedMonthViewDay = signal<CalendarMonthViewDay | null>(null);
  selectedDate = signal<Date | null>(null);
  todayDate = signal(new Date());

  access = signal<'new' | 'view' | 'edit'>('new');
  entryValues = signal({
    entryDate: new Date(),
    entryTitle: '',
    entryContent: '',
  });

  events = signal<CalendarEvent[]>(Events);
  selectedEntries = signal<CalendarEvent[]>([]);
  selectedEntry = signal<CalendarEvent | null>(null);

  dayClicked(day: CalendarMonthViewDay): void {
    if (this.selectedMonthViewDay()) {
      delete this.selectedMonthViewDay()?.cssClass;
    }

    if (this.selectedMonthViewDay() === day) {
      this.selectedMonthViewDay.set(null);
      return;
    }

    this.selectedMonthViewDay.set(day);
    this.selectedDate.set(day.date);
    day.cssClass = 'cal-day-selected';

    this.selectedEntries.set(this.events().filter((event) => isSameDay(event.start, day.date)));
  }

  addEntry(day: CalendarMonthViewDay) {
    this.access.set('new');
    this.updateEntryValues(day.date, '', '');
    this.appService.setIsEntryOpen(true);
    this.dayClicked(day);
  }

  viewEntry(entry: any) {
    this.access.set('view');
    this.updateEntryValues(entry.start, entry.title, entry.content);
    this.appService.setIsEntryOpen(true);
  }

  editEntry(entry: any) {
    this.access.set('edit');
    this.updateEntryValues(entry.start, entry.title, entry.content);
    this.appService.setIsEntryOpen(true);
  }

  deleteEntry(entry: any) {
    this.confirmationService.confirm({
      target: entry.target as EventTarget,
      message: 'Do you want to delete this entry? <br /><br />' + entry.title,
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
        this.messageService.add({
          severity: 'success',
          summary: 'Confirmed',
          detail: 'Record deleted',
        });
      },
      reject: () => {
        // this.messageService.add({
        //   severity: 'error',
        //   summary: 'Rejected',
        //   detail: 'You have rejected',
        // });
      },
    });
  }

  private updateEntryValues(date: Date, title: string, content: string) {
    this.entryValues.set({
      entryDate: date,
      entryTitle: title,
      entryContent: content,
    });
  }

  clearSelectedDay() {
    this.selectedMonthViewDay.set(null);
    // this.selectedDate.set(new Date());
  }

  beforeMonthViewRender({ body }: { body: CalendarMonthViewDay[] }): void {
    body.forEach((day) => {
      // day.badgeTotal = 0;
    });
  }

  entryClicked(entry: any) {
    this.selectedEntry.set(entry);
  }
}
