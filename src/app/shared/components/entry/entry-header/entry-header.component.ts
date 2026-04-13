import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { EntryAccess } from 'app/models/entry.models';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-entry-header',
  imports: [CommonModule, FormsModule, ButtonModule],
  templateUrl: './entry-header.component.html',
  styleUrl: './entry-header.component.css',
})
export class EntryHeaderComponent {
  private router = inject(Router);

  sourceId = input.required<string | null>();
  access = input.required<EntryAccess>();
  isEntryPaperExpanded = input.required<boolean>();

  delete = output<void>();
  showInfo = output<void>();

  header = computed(() => {
    switch (this.access()) {
      case 'new':
        return {
          label: 'Creating New Entry',
          icon: 'fa-solid fa-file-circle-plus fa-xl',
        };
      case 'view':
        return {
          label: 'Viewing Entry',
          icon: 'fa-solid fa-book-open fa-xl',
        };
      case 'edit-entry':
        return {
          label: 'Editing Entry',
          icon: 'fa-solid fa-pencil fa-xl',
        };
      case 'edit-draft':
        return {
          label: 'Editing Draft',
          icon: 'fa-solid fa-pencil fa-xl',
        };
      default:
        return {
          label: '',
          icon: '',
        };
    }
  });

  onShowInfo() {
    this.showInfo.emit();
  }

  toEditFromView() {
    this.router.navigate(['entry/edit', this.sourceId()]);
  }

  deleteEntry() {
    this.delete.emit();
  }
}
