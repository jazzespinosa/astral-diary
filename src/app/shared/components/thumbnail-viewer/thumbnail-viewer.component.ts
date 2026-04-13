import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { GalleryItem } from 'app/models/entry.models';

@Component({
  selector: 'app-thumbnail-viewer',
  imports: [],
  templateUrl: './thumbnail-viewer.component.html',
  styleUrl: './thumbnail-viewer.component.css',
})
export class ThumbnailViewerComponent {
  private destroyRef = inject(DestroyRef);

  thumbnails = input.required<GalleryItem[]>();
  imageWidth = input<number>(40);
  contentJustify = input<string>('flex-start');

  imageClicked = output<number>();

  imageContainer = viewChild<ElementRef<HTMLDivElement>>('imageContainer');

  containerWidth = signal<number>(0);
  imageGap = signal<number>(10);

  visibleData = computed(() => {
    const width = this.containerWidth();
    const allImages = this.thumbnails();

    if (width === 0) return { visible: allImages, hiddenCount: 0 };

    const itemSpace = this.imageWidth() + this.imageGap();
    const maxVisible = Math.floor((width + this.imageGap()) / itemSpace);

    if (maxVisible >= allImages.length) {
      return { visible: allImages, hiddenCount: 0 };
    } else {
      return {
        visible: allImages.slice(0, maxVisible),
        hiddenCount: allImages.length - maxVisible + 1,
      };
    }
  });

  constructor() {
    afterNextRender(() => {
      const el = this.imageContainer()?.nativeElement;
      if (!el) return;

      const resizeObserver = new ResizeObserver((entries) => {
        this.containerWidth.set(entries[0].contentRect.width);
      });

      resizeObserver.observe(el);

      this.destroyRef.onDestroy(() => resizeObserver.disconnect());
    });
  }

  onImageClick(index: number) {
    this.imageClicked.emit(index);
  }
}
