# Avoiding manual View subscriptions

Components should normally consume a View with `.signal()` or bind
`.observable()` with Angular's `AsyncPipe`. Both approaches let Angular manage
the reactive lifecycle.

## Failing example

The component manually subscribes to a View. Angular does not automatically
manage the lifecycle of this subscription, so the call is reported.

```ts
booksViews.loading.observable().subscribe((loading) => {
  this.loading = loading;
});
```

## Passing example

A signal exposes the View directly to the template and lets Angular manage its
lifecycle. The signal is created in the component's injection context.

```ts
@Component({
  selector: "app-books",
  template: `<p>{{ loading() ? "Loading" : "Ready" }}</p>`,
})
export class Books {
  protected readonly loading = booksViews.loading.signal();
}
```

Binding `.observable()` through Angular's `AsyncPipe` is another valid fix.

## Documenting an imperative exception

An imperative integration can retain a manual subscription with automatic
teardown and a suppression explaining the need:

```ts
// eslint-disable-next-line evst/no-view-subscription -- Updates a third-party widget.
booksViews.loading
  .observable()
  .pipe(takeUntilDestroyed())
  .subscribe(updateWidget);
```

`evst/no-view-subscription-suppression-reason` reports suppressions without an
explanation after `--`.

### Failing example

```ts
// eslint-disable-next-line evst/no-view-subscription
booksViews.loading
  .observable()
  .pipe(takeUntilDestroyed())
  .subscribe(updateWidget);
```

### Passing example

```ts
// eslint-disable-next-line evst/no-view-subscription -- Updates a third-party widget.
booksViews.loading
  .observable()
  .pipe(takeUntilDestroyed())
  .subscribe(updateWidget);
```

## Analysis scope

The rule recognizes direct and piped calls that begin with `.observable()` on
a conventional View reference, such as `booksView`, `booksViews`, or
`booksState.views`. It does not require type information.
