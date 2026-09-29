import { Injectable, signal } from "@angular/core";

@Injectable({ providedIn: "root" })
export class AppUiService {
  readonly sidenavOpen = signal(false);

  openSidenav(): void {
    this.sidenavOpen.set(true);
  }
  closeSidenav(): void {
    this.sidenavOpen.set(false);
  }
}
