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
import { ViewEntryComponent } from './pages/entries/view-entry/view-entry.component';
import { HomeSceneComponent } from './pages/home/home-scene/home-scene.component';
import { EditEntryComponent } from './pages/entries/edit-entry/edit-entry.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  {
    path: 'home',
    component: HomeComponent,
    children: [{ path: '', component: HomeSceneComponent, providers: [provideNgtRenderer()] }],
  },
  {
    path: 'entry',
    children: [
      { path: '', redirectTo: 'search', pathMatch: 'full' },
      {
        path: 'view/:id',
        component: ViewEntryComponent,
        // children: [
        //   { path: '', redirectTo: 'search', pathMatch: 'full' },
        //   // { path: 'edit', component: EditEntryComponent },
        // ],
      },
      {
        path: 'edit/:id',
        component: EditEntryComponent,
      },
      { path: 'new', component: AddEntryComponent },
      { path: 'search', component: SearchEntryComponent },
      { path: 'drafts', component: DraftsComponent },
      { path: '**', redirectTo: 'search', pathMatch: 'full' },
    ],
  },
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
