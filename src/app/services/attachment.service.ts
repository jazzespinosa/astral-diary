import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { catchError, map, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AttachmentService {
  private http = inject(HttpClient);

  private readonly BASE_URL = environment.backendUrl;

  getThumbnail(entityId: string, internalFileName: string) {
    const downloadUrl = `${this.BASE_URL}/attachment/get-thumbnail/${entityId}/${internalFileName}`;

    return this.http.get<{ token: string }>(`${this.BASE_URL}/attachment/token/${entityId}`).pipe(
      map((response) => {
        return `${downloadUrl}?t=${response.token}`;
      }),
      catchError(() => of('error-attachment.jpg')),
    );
  }

  getAttachment(entityId: string, fileName: string): Observable<Blob> {
    return this.http.get(`${this.BASE_URL}/attachment/get-attachment/${entityId}/${fileName}`, {
      responseType: 'blob',
    });
  }
}
