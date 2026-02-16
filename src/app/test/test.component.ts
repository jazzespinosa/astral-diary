import { Component, CUSTOM_ELEMENTS_SCHEMA, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-test',
  imports: [CommonModule],
  // templateUrl: './test.component.html',styleUrl: './test.component.css',
  template: `
    <div class="card-container" (click)="toggleFlip()">
      <div class="card" [class.flipped]="isFlipped">
        <div class="card-face card-front">
          <h2>Front Side</h2>
          <p>Click to flip!</p>
        </div>
        <div class="card-face card-back">
          <h2>Back Side</h2>
          <p>Click again!</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .card-container {
        perspective: 1000px;
        width: 300px;
        height: 400px;
        cursor: pointer;
      }

      .card {
        width: 100%;
        height: 100%;
        position: relative;
        transform-style: preserve-3d;
        transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .card.flipped {
        transform: rotateY(180deg);
      }

      .card-face {
        position: absolute;
        width: 100%;
        height: 100%;
        backface-visibility: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
      }

      .card-front {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .card-back {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        transform: rotateY(180deg);
      }

      h2 {
        margin: 0 0 20px 0;
        font-size: 2rem;
      }

      p {
        font-size: 1.2rem;
      }
    `,
  ],

  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TestComponent {
  // currentPage = 0;
  // pages = [
  //   { id: 1, title: 'Page 1', content: 'This is the first page', color: '#ff6b6b' },
  //   { id: 2, title: 'Page 2', content: 'This is the second page', color: '#4ecdc4' },
  //   { id: 3, title: 'Page 3', content: 'This is the third page', color: '#45b7d1' },
  //   { id: 4, title: 'Page 4', content: 'This is the fourth page', color: '#96ceb4' },
  // ];

  // nextPage() {
  //   if (this.currentPage < this.pages.length - 1) {
  //     this.currentPage++;
  //   }
  // }

  // previousPage() {
  //   if (this.currentPage > 0) {
  //     this.currentPage--;
  //   }
  // }

  isFlipped = false;

  toggleFlip() {
    this.isFlipped = !this.isFlipped;
  }
}
