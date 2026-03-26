import { Component, effect, input, OnDestroy, output, signal } from '@angular/core';

@Component({
  selector: 'app-avatar-selection',
  imports: [],
  templateUrl: './avatar-selection.component.html',
  styleUrl: './avatar-selection.component.css',
})
export class AvatarSelectionComponent {
  avatarChoices = input.required<string[]>();
  initialSelectedAvatar = input.required<string>();

  selectedAvatar = signal<string>('');
  selectedAvatarOutput = output<string>();

  constructor() {
    effect(() => {
      this.selectedAvatar.set(this.initialSelectedAvatar());
    });
  }

  onAvatarClick(avatar: string) {
    if (this.selectedAvatar() === avatar) {
      this.selectedAvatar.set('');
      this.selectedAvatarOutput.emit('');
    } else {
      this.selectedAvatar.set(avatar);
      this.selectedAvatarOutput.emit(avatar);
    }
  }
}
