import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { from, map, switchMap } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class EntryService {
  private http = inject(HttpClient);

  private readonly BASE_URL = environment.backendUrl;

  createEntry(formData: FormData) {
    return this.http.post(`${this.BASE_URL}/entry/create`, formData);
    // .pipe(
    //   map((response) => response),
    // );
  }
}
