import { Component, inject, OnInit } from '@angular/core';
import { AppService } from 'app/services/app.service';

@Component({
  selector: 'app-blur-background',
  imports: [],
  templateUrl: './blur-background.component.html',
  styleUrl: './blur-background.component.css',
})
export class BlurBackgroundComponent implements OnInit {
  protected appService = inject(AppService);

  ngOnInit(): void {}
}
