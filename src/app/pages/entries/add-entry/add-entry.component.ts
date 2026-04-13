import { Component, inject, OnInit, viewChild } from '@angular/core';
import { EntryComponent } from 'app/shared/components/entry/entry.component';
import { GeneralAppService } from 'app/services/general-app.service';
import { CanComponentDeactivate } from 'app/guards/pending-changes.guard';

@Component({
  selector: 'app-add-entry',
  imports: [EntryComponent],
  templateUrl: './add-entry.component.html',
  styleUrl: './add-entry.component.css',
})
export class AddEntryComponent implements CanComponentDeactivate {
  private appService = inject(GeneralAppService);

  entryForm = viewChild(EntryComponent);

  constructor() {
    this.appService.setIsEntryOpen(true);
  }

  hasUnsavedChanges(): boolean {
    return this.entryForm() ? this.entryForm()!.hasUnsavedChanges() : false;
  }

  isSubmitting(): boolean {
    return this.entryForm() ? this.entryForm()!.isSubmitting() : false;
  }
}
