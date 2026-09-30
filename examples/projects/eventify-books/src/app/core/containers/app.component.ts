import { Component } from "@angular/core";

import { fromAuth } from "@example-app/auth/store/auth.events";
import { authViews } from "@example-app/auth/store/auth.state";
import { fromLayout } from "@example-app/core/store/core.events";
import { coreViews } from "@example-app/core/store/core.state";
import { LayoutComponent } from "../components/layout.component";
import { SidenavComponent } from "../components/sidenav.component";
import { NgIf } from "@angular/common";
import { NavItemComponent } from "../components/nav-item.component";
import { RouterLink, RouterOutlet } from "@angular/router";
import { ToolbarComponent } from "../components/toolbar.component";

@Component({
  selector: "bc-app",
  template: `
    <bc-layout>
      <bc-sidenav [open]="showSidenav()" (closeMenu)="closeSidenav()">
        <bc-nav-item
          (navigate)="closeSidenav()"
          *ngIf="loggedIn()"
          routerLink="/"
          icon="book"
          hint="View your book collection"
        >
          My Collection
        </bc-nav-item>
        <bc-nav-item
          (navigate)="closeSidenav()"
          *ngIf="loggedIn()"
          routerLink="/books/find"
          icon="search"
          hint="Find your next book!"
        >
          Browse Books
        </bc-nav-item>
        <bc-nav-item (navigate)="closeSidenav()" *ngIf="!loggedIn()">
          Sign In
        </bc-nav-item>
        <bc-nav-item (navigate)="logout()" *ngIf="loggedIn()">
          Sign Out
        </bc-nav-item>
      </bc-sidenav>
      <bc-toolbar (openMenu)="openSidenav()"> Book Collection </bc-toolbar>

      <router-outlet></router-outlet>
    </bc-layout>
  `,
  imports: [
    LayoutComponent,
    SidenavComponent,
    NgIf,
    NavItemComponent,
    RouterLink,
    ToolbarComponent,
    RouterOutlet,
  ],
})
export class AppComponent {
  readonly showSidenav = coreViews.showSidenav.signal();
  readonly loggedIn = authViews.loggedIn.signal();

  closeSidenav() {
    fromLayout.sidenavClosed.publish();
  }

  openSidenav() {
    fromLayout.sidenavOpened.publish();
  }

  logout() {
    fromAuth.logoutConfirmation.publish();
  }
}
