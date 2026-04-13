import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-info',
  imports: [DatePipe],
  templateUrl: './info.component.html',
  styleUrl: './info.component.css',
})
export class InfoComponent {
  type = input<string | null>(null);
  typeComputed = computed(() => {
    switch (this.type()?.toLowerCase()) {
      case 'entry':
        return 'Entry';
      case 'draft':
        return 'Draft';
      default:
        return '';
    }
  });
  title = input<string>();
  date = input<Date>();
  created = input<Date>();
  lastModified = input<Date>();
  publishedAt = input<Date | null>();
}
