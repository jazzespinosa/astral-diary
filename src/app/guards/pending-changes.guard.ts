import { inject } from '@angular/core';
import { CanDeactivateFn, Router } from '@angular/router';

export interface CanComponentDeactivate {
  hasUnsavedChanges: () => boolean;
  isSubmitting?: () => boolean;
}

export const pendingChangesGuard: CanDeactivateFn<CanComponentDeactivate> = (
  component,
  currentRoute,
  currentState,
  nextState,
) => {
  const router = inject(Router);
  const navigation = router.currentNavigation();

  if (component.hasUnsavedChanges()) {
    if (navigation?.trigger === 'popstate') {
      return confirm('Changes not yet saved! Do you really want to leave?');
    }

    if (!component.isSubmitting?.()) {
      return confirm('Changes not yet saved! Do you really want to leave?');
    }
  }

  return true;
};
