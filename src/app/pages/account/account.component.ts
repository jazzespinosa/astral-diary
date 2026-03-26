import { CommonModule, DatePipe, formatDate } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  model,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { GetUserInfoResponse } from 'app/models/auth.models';
import { GetUserMoodMapResponse } from 'app/models/entry.models';
import { ApiClientService } from 'app/services/api-client.service';
import { GeneralAppService } from 'app/services/general-app.service';
import { AvatarSelectionComponent } from 'app/shared/components/avatar-selection/avatar-selection.component';
import { endOfYear, startOfYear } from 'date-fns';
import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

interface HeatmapDay {
  date: string;
  level: number; // 1-5
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const avatars = [
  'avatar/avatar-bull.svg',
  'avatar/avatar-butterfly.svg',
  'avatar/avatar-cat.svg',
  'avatar/avatar-chicken.svg',
  'avatar/avatar-cow.svg',
  'avatar/avatar-dog.svg',
  'avatar/avatar-fish.svg',
  'avatar/avatar-frog.svg',
  'avatar/avatar-giraffe.svg',
  'avatar/avatar-goat.svg',
  'avatar/avatar-mouse.svg',
  'avatar/avatar-pig.svg',
  'avatar/avatar-rabbit.svg',
  'avatar/avatar-sheep.svg',
  'avatar/avatar-starfish.svg',
];

@Component({
  selector: 'app-account',
  imports: [CommonModule, Button, DatePipe, RouterLink, DialogModule, AvatarSelectionComponent],
  templateUrl: './account.component.html',
  styleUrl: './account.component.css',
})
export class AccountComponent implements OnInit {
  private apiClientService = inject(ApiClientService);
  private generalAppService = inject(GeneralAppService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly heatmapMonths = months;
  heatmapDays = signal<HeatmapDay[]>([]);
  userInfo = signal<GetUserInfoResponse | null>(null);

  isAvatarDialogOpen = model(false);
  avatarChoices = signal<string[]>(avatars);

  dialogSelectedAvatar = signal<string>('');
  displayedAvatar = signal<string>('');

  isSaveEnable = computed(() => {
    return this.displayedAvatar() !== this.userInfo()?.avatar;
  });

  constructor() {
    effect(() => {
      this.displayedAvatar.set(this.userInfo()?.avatar ?? '');
    });
  }

  ngOnInit(): void {
    this.apiClientService
      .getUserInfo(new Date())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.userInfo.set(response);
        },
      });

    this.apiClientService
      .getUserMoodMap(new Date())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const days = this.generateHeatmap(response);
          this.heatmapDays.set(days);
        },
      });
  }

  onFirstEntryClick() {
    if (!this.userInfo()?.firstEntryId) return;
    this.router.navigate([`entry/view/${this.userInfo()?.firstEntryId}`]);
  }

  onLatestEntryClick() {
    if (!this.userInfo()?.latestEntryId) return;
    this.router.navigate([`entry/view/${this.userInfo()?.latestEntryId}`]);
  }

  onAvatarClick() {
    this.isAvatarDialogOpen.set(true);
  }

  confirmAvatarSelection() {
    this.isAvatarDialogOpen.set(false);
    this.displayedAvatar.set(this.dialogSelectedAvatar());
  }

  onAvatarSelect(avatar: string) {
    this.dialogSelectedAvatar.set(avatar);
  }

  onSave() {
    this.apiClientService
      .saveUserAvatar(this.displayedAvatar())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.userInfo.update((user) => {
            if (!user) return user;
            return {
              ...user,
              avatar: response.avatar,
            };
          });

          this.generalAppService.setSuccessToast('Avatar updated successfully');
        },
        error: (error) => {
          console.error(error);
          this.generalAppService.setErrorToast(error.message);
        },
      });
  }

  private generateHeatmap(moodMap: GetUserMoodMapResponse[]): HeatmapDay[] {
    const days: HeatmapDay[] = [];
    const today = new Date();
    const firstDayOfTheYear = startOfYear(today);
    const lastDayOfTheYear = endOfYear(today);

    for (let d = firstDayOfTheYear; d <= lastDayOfTheYear; d.setDate(d.getDate() + 1)) {
      const moods = moodMap.filter(
        (m) => m.date.toString() === formatDate(d, 'yyyy-MM-dd', 'en-US') && m.mood > 0,
      );

      let level = 0;
      if (moods.length === 1) level = moods[0].mood;
      else if (moods.length > 1) {
        level = moods.reduce((sum, curr) => sum + curr.mood, 0) / moods.length;
        level = Math.floor(level);
      }

      days.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        level: level,
      });
    }
    return days;
  }
}
