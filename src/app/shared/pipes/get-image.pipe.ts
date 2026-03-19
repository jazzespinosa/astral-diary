import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { AttachmentType } from 'app/models/entry.models';
import { AttachmentService } from 'app/services/attachment.service';
import { map } from 'rxjs';

@Pipe({
  name: 'getImage',
})
export class GetImagePipe implements PipeTransform {
  private attachmentService = inject(AttachmentService);

  transform(id: string, internalFileName: string, type: AttachmentType) {
    return this.attachmentService.getThumbnail(id, internalFileName);
  }
}
