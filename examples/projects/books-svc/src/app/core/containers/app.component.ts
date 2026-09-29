import { NgIf } from "@angular/common";
import { Component } from "@angular/core";
import { RouterLink, RouterOutlet } from "@angular/router";
import { AuthSessionService } from "@example-app/auth/services";
import { AppUiService } from "@example-app/core/services";
import { LayoutComponent } from "../components/layout.component";
import { NavItemComponent } from "../components/nav-item.component";
import { SidenavComponent } from "../components/sidenav.component";
import { ToolbarComponent } from "../components/toolbar.component";

@Component({
  selector: "bc-app",
  template: `
    <bc-layout>
      <bc-sidenav [open]="ui.sidenavOpen()" (closeMenu)="ui.closeSidenav()">
        <bc-nav-item
          (navigate)="ui.closeSidenav()"
          *ngIf="session.loggedIn()"
          routerLink="/"
          icon="book"
          hint="View your book collection"
          >My Collection</bc-nav-item
        >
        <bc-nav-item
          (navigate)="ui.closeSidenav()"
          *ngIf="session.loggedIn()"
          routerLink="/books/find"
          icon="search"
          hint="Find your next book!"
          >Browse Books</bc-nav-item
        >
        <bc-nav-item (navigate)="ui.closeSidenav()" *ngIf="!session.loggedIn()"
          >Sign In</bc-nav-item
        >
        <bc-nav-item (navigate)="logout()" *ngIf="session.loggedIn()"
          >Sign Out</bc-nav-item
        >
      </bc-sidenav>
      <bc-toolbar (openMenu)="ui.openSidenav()">Book Collection</bc-toolbar>
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
  constructor(
    readonly session: AuthSessionService,
    readonly ui: AppUiService,
  ) {}

  logout(): void {
    this.ui.closeSidenav();
    this.session.confirmLogout();
  }
}
