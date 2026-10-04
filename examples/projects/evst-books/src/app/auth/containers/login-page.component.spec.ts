import { signal } from "@angular/core";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { ReactiveFormsModule } from "@angular/forms";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { LoginPageComponent } from "@example-app/auth/containers";
import { authViews } from "@example-app/auth/evst/auth.state";
import { fromLoginPage } from "@example-app/auth/evst/auth.events";

describe("Login Page", () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  let instance: LoginPageComponent;

  afterEach(() => vi.restoreAllMocks());

  beforeEach(() => {
    vi.spyOn(authViews.loginPagePending, "signal").mockReturnValue(
      signal(false),
    );
    vi.spyOn(authViews.loginPageError, "signal").mockReturnValue(signal(null));
    vi.spyOn(fromLoginPage.login, "publish").mockImplementation(() => {});

    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, ReactiveFormsModule, LoginPageComponent],
    });

    fixture = TestBed.createComponent(LoginPageComponent);
    instance = fixture.componentInstance;
  });

  it("should compile", () => {
    fixture.detectChanges();

    expect(fixture).toMatchSnapshot();
  });

  it("should publish login on submit", () => {
    const credentials = { username: "reader", password: "password" };
    const payload = { credentials };

    instance.onSubmit(credentials);

    expect(fromLoginPage.login.publish).toHaveBeenCalledWith(payload);
  });
});
