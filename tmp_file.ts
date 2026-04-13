import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { DataUrl, NgxImageCompressService, UploadResponse } from 'ngx-image-compress';
import { catchError, map, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AttachmentService {
  private http = inject(HttpClient);
  private imageCompress = inject(NgxImageCompressService);

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

  // generateThumbnail(file: File): Promise<Blob> {
  //   return new Promise((resolve, reject) => {
  //     const img = new Image();
  //     const url = URL.createObjectURL(file);
  //     const maxPx = 150;
  //     const quality = 0.8;
  //     const outputType = 'image/jpeg';

  //     img.onload = () => {
  //       URL.revokeObjectURL(url);

  //       const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
  //       const w = Math.round(img.width * scale);
  //       const h = Math.round(img.height * scale);

  //       const canvas = document.createElement('canvas');
  //       canvas.width = w;
  //       canvas.height = h;
  //       const ctx = canvas.getContext('2d');
  //       if (!ctx) {
  //         reject(new Error('Canvas 2d context unavailable'));
  //         return;
  //       }

  //       ctx.drawImage(img, 0, 0, w, h);

  //       canvas.toBlob(
  //         (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
  //         outputType,
  //         quality,
  //       );
  //     };

  //     img.onerror = () => {
  //       URL.revokeObjectURL(url);
  //       reject(new Error('Failed to load image for thumbnail'));
  //     };

  //     img.src = url;
  //   });
  // }

  imgResultAfterResize: DataUrl = '';
  generateThumbnail() {
    return this.imageCompress
      .uploadFile() // CHANGE UPLOAD FILE TO GET FILE FROM INPUT
      .then(({ image, orientation }: UploadResponse) => {
        console.warn('Size in bytes was:', this.imageCompress.byteCount(image));
        console.warn('Compressing and resizing to width 200px height 200px...');

        this.imageCompress
          .compressFile(image, orientation, 50, 50, 200, 200)
          .then((result: DataUrl) => {
            this.imgResultAfterResize = result;
            console.warn('Size in bytes is now:', this.imageCompress.byteCount(result));
          });
      });
  }
}
