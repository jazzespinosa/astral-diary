import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { CalendarComponent } from './pages/calendar/calendar.component';
import { AboutComponent } from './pages/about/about.component';
import { AddEntryComponent } from './pages/entries/add-entry/add-entry.component';
import { SearchEntryComponent } from './pages/entries/search-entry/search-entry.component';
import { DraftsComponent } from './pages/entries/drafts/drafts.component';
import { AccountComponent } from './pages/account/account.component';
import { LandingComponent } from './pages/landing/landing.component';
import { provideNgtRenderer } from 'angular-three/dom';
import { AuthComponent } from './pages/auth/auth.component';
import { ViewEntryComponent } from './pages/entries/view-entry/view-entry.component';
import { HomeSceneComponent } from './pages/home/home-scene/home-scene.component';
import { EditEntryComponent } from './pages/entries/edit-entry/edit-entry.component';
import { authChildGuard, authGuard, loginGuard } from './guards/auth.guard';
import { pendingChangesGuard } from './guards/pending-changes.guard';

export const routes: Routes = [
  { path: '', component: LandingComponent, canActivate: [loginGuard] },
  {
    path: 'home',
    component: HomeComponent,
    children: [{ path: '', component: HomeSceneComponent, providers: [provideNgtRenderer()] }],
  },
  {
    path: 'entry',
    canActivateChild: [authChildGuard],
    children: [
      { path: '', redirectTo: 'search', pathMatch: 'full' },
      {
        path: 'view/:id',
        component: ViewEntryComponent,
      },
      {
        path: 'edit/:id',
        component: EditEntryComponent,
        canDeactivate: [pendingChangesGuard],
      },
      {
        path: 'new',
        component: AddEntryComponent,
        canDeactivate: [pendingChangesGuard],
      },
      { path: 'search', component: SearchEntryComponent },
      { path: 'drafts', component: DraftsComponent },
      { path: '**', redirectTo: 'search', pathMatch: 'full' },
    ],
  },
  { path: 'calendar', component: CalendarComponent, canActivate: [authGuard] },
  { path: 'account', component: AccountComponent, canActivate: [authGuard] },
  { path: 'about', component: AboutComponent },
  { path: 'auth', component: AuthComponent, canActivate: [loginGuard] },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
