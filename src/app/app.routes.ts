import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { TestComponent } from './test/test.component';
import { CalendarComponent } from './pages/calendar/calendar.component';
import { AboutComponent } from './pages/about/about.component';
import { AddEntryComponent } from './pages/entries/add-entry/add-entry.component';
import { Test2Component } from './test2/test2.component';
import { SearchEntryComponent } from './pages/entries/search-entry/search-entry.component';
import { DraftsComponent } from './pages/entries/drafts/drafts.component';
import { AccountComponent } from './pages/account/account.component';
import { LandingComponent } from './pages/landing/landing.component';
import { provideNgtRenderer } from 'angular-three/dom';
import { AuthComponent } from './pages/auth/auth.component';

export const routes: Routes = [
  // { path: '', redirectTo: '', pathMatch: 'full' },
  { path: '', component: LandingComponent },
  {
    path: 'home',
    component: HomeComponent,
    providers: [provideNgtRenderer()],
  },
  { path: 'entry/add', component: AddEntryComponent },
  { path: 'entry/search', component: SearchEntryComponent },
  { path: 'entry/drafts', component: DraftsComponent },
  { path: 'calendar', component: CalendarComponent },
  { path: 'account', component: AccountComponent },
  { path: 'about', component: AboutComponent },
  { path: 'auth', component: AuthComponent },
  {
    path: 'test',
    component: TestComponent,
    providers: [provideNgtRenderer()],
  },
  {
    path: 'test2',
    component: Test2Component,
    providers: [provideNgtRenderer()],
  },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
