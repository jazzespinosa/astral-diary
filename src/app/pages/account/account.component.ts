import { CommonModule, DatePipe, formatDate } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  model,
  OnInit,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { Router } from '@angular/router';
import { GetUserInfoResponse } from 'app/models/auth.models';
import { DecryptedDocument, GetUserMoodMapResponse } from 'app/models/entry.models';
import { ApiClientService } from 'app/services/api-client.service';
import { AuthService } from 'app/services/auth.service';
import { GeneralAppService } from 'app/services/general-app.service';
import { RecycleBinComponent } from 'app/shared/components/recycle-bin/recycle-bin.component';
import { endOfYear, startOfYear } from 'date-fns';
import { Button, ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { firstValueFrom } from 'rxjs';

interface HeatmapDay {
  date: string;
  level: number; // 1-5
}

const avatars = [
  'avatar/avatar-cat.svg',
  'avatar/avatar-rabbit.svg',
  'avatar/avatar-dog.svg',
  'avatar/avatar-frog.svg',
  'avatar/avatar-mouse.svg',
  'avatar/avatar-butterfly.svg',
  'avatar/avatar-giraffe.svg',
  'avatar/avatar-starfish.svg',
  'avatar/avatar-bull.svg',
  'avatar/avatar-goat.svg',
  'avatar/avatar-pig.svg',
  'avatar/avatar-cow.svg',
  'avatar/avatar-fish.svg',
  'avatar/avatar-sheep.svg',
  'avatar/avatar-chicken.svg',
];

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

@Component({
  selector: 'app-account',
  imports: [CommonModule, Button, DatePipe, DialogModule, RecycleBinComponent, ButtonModule],
  templateUrl: './account.component.html',
  styleUrl: './account.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class AccountComponent implements OnInit {
  private apiClientService = inject(ApiClientService);
  private authService = inject(AuthService);
  private generalAppService = inject(GeneralAppService);
  private router = inject(Router);

  readonly heatmapMonths = months;
  heatmapDays = signal<HeatmapDay[]>([]);
  displayYear = signal(new Date().getFullYear());
  userInfo = signal<GetUserInfoResponse | null>(null);

  avatarChoices = avatars;
  isAvatarDialogOpen = model(false);
  displayedAvatar = signal<string>('');
  dialogSelectedAvatar = signal<string>('');

  isRecycleBinDialogOpen = model(false);
  deletedEntries = signal<DecryptedDocument[]>([]);
  selectedEntryIds = signal<string[]>([]);

  isSaveEnable = computed(() => {
    return this.displayedAvatar() !== this.userInfo()?.avatar;
  });

  constructor() {
    effect(() => {
      this.displayedAvatar.set(this.userInfo()?.avatar ?? '');
    });
  }

  ngOnInit(): void {
    this.updateUserInfo();
    this.onChangeYear(this.displayYear());
  }

  confirmAvatarSelection() {
    this.isAvatarDialogOpen.set(false);
    this.displayedAvatar.set(this.dialogSelectedAvatar());
  }

  onHeaderAvatarClick() {
    this.dialogSelectedAvatar.set(this.displayedAvatar());
    this.isAvatarDialogOpen.set(true);
  }

  onSelectionAvatarClick(avatar: string) {
    if (this.dialogSelectedAvatar() === avatar) {
      this.dialogSelectedAvatar.set('');
    } else {
      this.dialogSelectedAvatar.set(avatar);
    }
  }

  async updateUserInfo() {
    try {
      const response = await firstValueFrom(this.apiClientService.getUserInfo(new Date()));
      this.userInfo.set(response);
    } catch (error) {
      console.error(error);
    }
  }

  onTotalEntriesClick() {
    this.router.navigate(['entry/search'], { queryParams: { q: '' } });
  }

  onFirstEntryClick() {
    if (!this.userInfo()?.firstEntryId) return;
    this.router.navigate([`entry/view/${this.userInfo()?.firstEntryId}`]);
  }

  onLatestEntryClick() {
    if (!this.userInfo()?.latestEntryId) return;
    this.router.navigate([`entry/view/${this.userInfo()?.latestEntryId}`]);
  }

  onCurrentStreakClick() {
    this.router.navigate(['calendar']);
  }

  async onChangeYear(year: number) {
    this.displayYear.set(year);
    try {
      const response = await firstValueFrom(
        this.apiClientService.getUserMoodMap(this.displayYear()),
      );
      const days = this.generateHeatmap(response, this.displayYear());
      this.heatmapDays.set(days);
    } catch (error) {
      console.error(error);
    }
  }

  onHeatMapCellClick(day: HeatmapDay) {
    const date = formatDate(day.date, 'yyyy-MM-dd', 'en-US');
    this.router.navigate(['entry/search'], { queryParams: { q: '', filter: 'exact', date: date } });
  }

  async onSave() {
    try {
      const response = await firstValueFrom(
        this.apiClientService.saveUserAvatar(this.displayedAvatar()),
      );
      this.userInfo.update((user) => {
        if (!user) return user;
        return {
          ...user,
          avatar: response.avatar,
        };
      });

      this.authService.updateUserAvatar(this.displayedAvatar());
      this.generalAppService.setSuccessToast('Changes saved successfully.');
    } catch (error: any) {
      console.error(error);
      this.generalAppService.setErrorToast(error.message || 'Failed to save changes.');
    }
  }

  onLogout() {
    this.authService.onLogout();
  }

  private generateHeatmap(moodMap: GetUserMoodMapResponse[], year: number): HeatmapDay[] {
    const days: HeatmapDay[] = [];
    const firstDayOfTheYear = startOfYear(new Date(year, 0, 1));
    const lastDayOfTheYear = endOfYear(new Date(year, 0, 1));

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

  onMoodLegendClick(mood: number) {
    this.router.navigate(['entry/search'], { queryParams: { q: '', mood: mood } });
  }

  async onRecycleBinOpen() {
    try {
      const response = await firstValueFrom(this.apiClientService.getDeletedEntries());
      this.deletedEntries.set(response);
      this.isRecycleBinDialogOpen.set(true);
    } catch (error) {
      console.error(error);
    }
  }

  onSelectEntryIds(entryIds: string[]) {
    this.selectedEntryIds.set(entryIds);
  }

  async onRestoreEntries() {
    if (this.selectedEntryIds().length === 0) return;

    try {
      const response = await firstValueFrom(
        this.apiClientService.restoreDeletedEntries(this.selectedEntryIds()),
      );
      if (response.result) {
        this.updateUserInfo();
        this.onChangeYear(this.displayYear());
        this.isRecycleBinDialogOpen.set(false);
        this.generalAppService.setSuccessToast('Entries restored successfully.');
      } else {
        this.generalAppService.setErrorToast(response.message);
      }
    } catch (error: any) {
      console.error(error);
      this.generalAppService.setErrorToast(error.message || 'Failed to restore entries.');
    }
  }
}
