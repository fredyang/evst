import { firstValueFrom, of } from "rxjs";
import { authGuard } from "./auth-guard.service";
import { authViews } from "../evst/auth.state";
import { fromAuthGuard } from "../evst/auth.events";

describe("Auth Guard", () => {
  beforeEach(() => {
    vi.spyOn(fromAuthGuard.loginRequired, "publish").mockImplementation(
      () => {},
    );
  });

  afterEach(() => vi.restoreAllMocks());

  it("should reject unauthenticated users and publish loginRequired", async () => {
    vi.spyOn(authViews.loggedIn, "observable").mockReturnValue(of(false));

    expect(await firstValueFrom(authGuard())).toBe(false);
    expect(
      fromAuthGuard.loginRequired.publish,
    ).toHaveBeenCalledExactlyOnceWith();
  });

  it("should allow authenticated users without requesting login", async () => {
    vi.spyOn(authViews.loggedIn, "observable").mockReturnValue(of(true));

    expect(await firstValueFrom(authGuard())).toBe(true);
    expect(fromAuthGuard.loginRequired.publish).not.toHaveBeenCalled();
  });

  it("should complete after the first authentication value", () => {
    vi.spyOn(authViews.loggedIn, "observable").mockReturnValue(of(false, true));
    const next = vi.fn();
    const complete = vi.fn();

    authGuard().subscribe({ next, complete });

    expect(next).toHaveBeenCalledExactlyOnceWith(false);
    expect(complete).toHaveBeenCalledOnce();
    expect(fromAuthGuard.loginRequired.publish).toHaveBeenCalledOnce();
  });
});
