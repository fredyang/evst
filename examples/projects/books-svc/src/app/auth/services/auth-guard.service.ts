import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { AuthSessionService } from "./auth-session.service";

export const authGuard = () => {
  const session = inject(AuthSessionService);
  const router = inject(Router);
  return session.loggedIn() ? true : router.createUrlTree(["/login"]);
};
