import { Observable } from "rxjs";
import { map, take } from "rxjs/operators";
import { fromAuthGuard } from "@example-app/auth/evst/auth.evst";
import { authViews } from "@example-app/auth/evst/auth.evst";

export const authGuard = (): Observable<boolean> => {
  return authViews.loggedIn.observable().pipe(
    map((authed) => {
      if (!authed) {
        fromAuthGuard.loginRequired.publish();
        return false;
      }

      return true;
    }),
    take(1),
  );
};
