import { RouteReuseStrategy, ActivatedRouteSnapshot, DetachedRouteHandle } from '@angular/router';

export class CustomReuseStrategy implements RouteReuseStrategy {
  private storedHandles = new Map<string, DetachedRouteHandle>();

  private routesToCache = ['calendar', 'search', 'drafts'];

  private getPath(route: ActivatedRouteSnapshot): string {
    return route.routeConfig?.path ?? '';
  }

  public clearSavedRoute(path: string): void {
    if (this.storedHandles.has(path)) {
      this.storedHandles.delete(path);
    }
  }

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return this.routesToCache.includes(this.getPath(route));
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    if (handle) {
      this.storedHandles.set(this.getPath(route), handle);
    }
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return !!route.routeConfig && this.storedHandles.has(this.getPath(route));
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    if (!route.routeConfig) return null;
    return this.storedHandles.get(this.getPath(route)) ?? null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig;
  }
}
