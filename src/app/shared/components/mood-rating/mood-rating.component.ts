import {
  Component,
  computed,
  effect,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { EntryAccess } from 'app/models/entry.models';
import { TooltipModule } from 'primeng/tooltip';

interface MoodLevel {
  value: number;
  icon: string;
  label: string;
}

export const MOODS: MoodLevel[] = [
  { value: 1, icon: 'mood/1-awful.svg', label: 'Awful' },
  { value: 2, icon: 'mood/2-bad.svg', label: 'Bad' },
  { value: 3, icon: 'mood/3-ok.svg', label: 'Okay' },
  { value: 4, icon: 'mood/4-good.svg', label: 'Good' },
  { value: 5, icon: 'mood/5-great.svg', label: 'Great' },
];

@Component({
  selector: 'app-mood-rating',
  imports: [TooltipModule],
  templateUrl: './mood-rating.component.html',
  styleUrl: './mood-rating.component.css',
})
export class MoodRatingComponent implements OnDestroy {
  mood = input<number>(0);
  access = input<EntryAccess>();
  moodChange = output<number>();

  readonly moods = MOODS;
  rating = model(0);
  hovered = signal(0);
  label = computed(() => {
    const v = this.hovered() || this.rating();
    return this.moods.find((m) => m.value === v)?.label ?? 'Select one';
  });

  constructor() {
    effect(() => {
      if (this.mood() && this.mood()! > 0 && this.mood()! <= 5) {
        this.rating.set(this.mood()!);
      }
    });
  }

  ngOnDestroy(): void {
    this.moodChange.emit(0);
  }

  displayIcon(position: number): string | null {
    const active = this.hovered() || this.rating();
    if (active && position <= active) {
      return this.moods.find((m) => m.value === active)!.icon;
    }
    return null;
  }

  select(value: number): void {
    this.rating.set(this.rating() === value ? 0 : value);

    if (this.rating() <= 0 || this.rating() > 5) {
      this.moodChange.emit(0);
    } else {
      this.moodChange.emit(this.rating());
    }
  }
}
