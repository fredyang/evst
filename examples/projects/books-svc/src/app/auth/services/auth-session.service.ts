import { computed, inject, Injectable, signal } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Router } from "@angular/router";
import { Credentials, User } from "@example-app/auth/models";
import { LogoutConfirmationDialogComponent } from "@example-app/auth/components";
import { AuthService } from "./auth.service";

/** Owns authentication state and the commands that change it. */
@Injectable({ providedIn: "root" })
export class AuthSessionService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly userState = signal<User | null>(null);
  readonly pending = signal(false);
  readonly error = signal<string | null>(null);
  readonly user = this.userState.asReadonly();
  readonly loggedIn = computed(() => this.userState() !== null);

  login(credentials: Credentials): void {
    if (this.pending()) return;

    this.pending.set(true);
    this.error.set(null);
    this.auth.login(credentials).subscribe({
      next: (user) => {
        this.userState.set(user);
        this.pending.set(false);
        void this.router.navigate(["/"]);
      },
      error: (error: unknown) => {
        this.error.set(typeof error === "string" ? error : "Unable to sign in");
        this.pending.set(false);
      },
    });
  }

  confirmLogout(): void {
    this.dialog
      .open<LogoutConfirmationDialogComponent, undefined, boolean>(
        LogoutConfirmationDialogComponent,
      )
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) this.logout();
      });
  }

  logout(): void {
    this.auth.logout().subscribe(() => {
      this.userState.set(null);
      this.error.set(null);
      void this.router.navigate(["/login"]);
    });
  }
}
