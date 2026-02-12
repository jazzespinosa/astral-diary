import { Component, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';

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
  ],
  templateUrl: './search-entry.component.html',
  styleUrl: './search-entry.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class SearchEntryComponent implements OnInit {
  sort!: string;
  selectedDateFilter!: string;
  defaultDate = signal(new Date());

  ngOnInit(): void {
    this.sort = 'desc';
    this.selectedDateFilter = 'Any';
  }
}
