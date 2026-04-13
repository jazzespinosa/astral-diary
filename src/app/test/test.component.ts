import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EncryptionService } from 'app/services/encryption.service';
import { HttpClient } from '@angular/common/http';
import { EncryptedPayload, JournalEntry } from 'app/models/entry.models';
import { InfoComponent } from 'app/shared/components/info/info.component';

@Component({
  selector: 'app-test',
  imports: [CommonModule, FormsModule, InfoComponent],
  templateUrl: './test.component.html',
  styleUrl: './test.component.css',
})
export class TestComponent {
  private readonly crypto = inject(EncryptionService);
  private readonly http = inject(HttpClient);

  title = '';
  content = '';
  mood = 0;
  passphrase = '';
  saving = signal(false);

  async submit(): Promise<void> {
    this.saving.set(true);

    const entry: JournalEntry = {
      title: this.title,
      content: this.content,
    };

    try {
      const payload: EncryptedPayload = await this.crypto.encrypt(entry);
      console.log('payload', payload);
      // Send encrypted payload to .NET Core backend
      // this.http.post('/api/journal/entries', payload).subscribe({
      //   next: () => console.log('Entry saved!'),
      //   error: (err) => console.error('Save failed', err),
      // });
    } finally {
      this.saving.set(false);
    }
  }
}
