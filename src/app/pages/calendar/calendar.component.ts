import { Component, inject, ViewEncapsulation } from '@angular/core';
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
import { EntryComponent } from 'app/shared/entry/entry.component';
import { AppService } from 'app/services/app.service';
import { DatePipe } from '@angular/common';

const Events = [
  {
    start: new Date(),
    title:
      'Event 1 In my current role, as a Security Delivery Associate in Accenture Inc, I oversee processing most of our provisioning tickets.',
  },
  {
    start: new Date(),
    title: 'Event 2',
  },
  {
    start: new Date(),
    title: 'Event 3',
  },
  {
    start: new Date(),
    title: 'Event 4',
  },
  {
    start: new Date(new Date().setDate(new Date().getDate() + 2)),
    title: 'Event 5',
  },
  {
    start: new Date(new Date().setDate(new Date().getDate() + 4)),
    title: 'Event 6',
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
    DialogModule,
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
export class CalendarComponent {
  // inject dependencies
  protected appService = inject(AppService);

  readonly CalendarView = CalendarView;
  visible: boolean = false;

  selectedMonthViewDay: CalendarMonthViewDay | null = null;
  viewTodayDate = new Date();
  selectedDate: Date | null = null;

  events: CalendarEvent[] = Events;

  // Entries Dialog
  visibleEntriesDialog: boolean = false;
  selectedEntries: CalendarEvent[] = [];

  dayClicked(day: CalendarMonthViewDay): void {
    if (this.selectedMonthViewDay) {
      delete this.selectedMonthViewDay.cssClass;
    }

    if (this.selectedMonthViewDay === day) {
      this.selectedMonthViewDay = null;
      return;
    }

    this.selectedMonthViewDay = day;
    this.selectedDate = day.date;
    day.cssClass = 'cal-day-selected';

    this.selectedEntries = this.events.filter(
      (event) => event.start.getDate() === day.date.getDate(),
    );
  }

  addEntry(day: CalendarMonthViewDay) {
    this.appService.setIsEntryOpen(true);
    this.dayClicked(day);
  }

  beforeMonthViewRender({ body }: { body: CalendarMonthViewDay[] }): void {
    body.forEach((day) => {
      // day.badgeTotal = 0;
    });
  }
}
