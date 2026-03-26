import { Component, computed, effect, input, model, OnInit, output, signal } from '@angular/core';
import { EntryAccess } from 'app/models/entry.models';
import { TooltipModule } from 'primeng/tooltip';

interface MoodLevel {
  value: number;
  icon: string;
  label: string;
}

const MOODS: MoodLevel[] = [
  { value: 1, icon: '1-awful.svg', label: 'Awful' },
  { value: 2, icon: '2-sad.svg', label: 'Bad' },
  { value: 3, icon: '3-ok.svg', label: 'Okay' },
  { value: 4, icon: '4-good.svg', label: 'Good' },
  { value: 5, icon: '5-great.svg', label: 'Great' },
];

@Component({
  selector: 'app-mood-rating',
  imports: [TooltipModule],
  templateUrl: './mood-rating.component.html',
  styleUrl: './mood-rating.component.css',
})
export class MoodRatingComponent {
  mood = input<number | null>(null);
  access = input<EntryAccess>();
  moodChange = output<number | null>();

  readonly moods = MOODS;
  readonly rating = model(0);
  readonly hovered = signal(0);
  readonly label = computed(() => {
    const v = this.hovered() || this.rating();
    return this.moods.find((m) => m.value === v)?.label ?? 'Select a mood';
  });

  constructor() {
    effect(() => {
      if (this.mood() && this.mood()! > 0 && this.mood()! <= 5) {
        this.rating.set(this.mood()!);
      }
    });
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
      this.moodChange.emit(null);
    } else {
      this.moodChange.emit(this.rating());
    }
  }
}
