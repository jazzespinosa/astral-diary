import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgtCanvas } from 'angular-three/dom';
import { NgtsPerspectiveCamera } from 'angular-three-soba/cameras';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-test2',
  imports: [NgtCanvas, CommonModule],
  templateUrl: './test2.component.html',
  styleUrl: './test2.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Test2Component {
  isFlipping = false;

  turnPage() {
    this.isFlipping = true;
  }

  onAnimationEnd() {
    console.log('onAnimationEnd');
    this.isFlipping = false;
    // Optional: swap content or navigate routes here
  }
}
