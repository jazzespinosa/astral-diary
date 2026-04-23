import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-card-skeleton',
  imports: [CardModule, SkeletonModule],
  templateUrl: './card-skeleton.component.html',
  styleUrl: './card-skeleton.component.css',
})
export class CardSkeletonComponent {}
