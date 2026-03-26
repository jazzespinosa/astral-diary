import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { AttachmentService } from 'app/services/attachment.service';

@Pipe({
  name: 'getImage',
})
export class GetImagePipe implements PipeTransform {
  private attachmentService = inject(AttachmentService);

  transform(id: string, internalFileName: string) {
    return this.attachmentService.getThumbnail(id, internalFileName);
  }
}
