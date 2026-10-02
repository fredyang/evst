# Avoiding manual View subscriptions

Components should normally consume a View with `.signal()` or bind
`.observable()` with Angular's `AsyncPipe`. Both approaches let Angular manage
the reactive lifecycle.

```ts
// Reported
booksViews.loading.observable().subscribe((loading) => {
  this.loading = loading;
});

// Preferred
readonly loading = booksViews.loading.signal();
readonly loading$ = booksViews.loading.observable();
```

Manual subscriptions remain appropriate for an imperative integration. They
should use automatic teardown and document why the warning is suppressed.

```ts
// eslint-disable-next-line evst/no-view-subscription -- Updates a third-party widget.
booksViews.loading
  .observable()
  .pipe(takeUntilDestroyed())
  .subscribe(updateWidget);
```

The rule recognizes direct and piped calls that begin with `.observable()` on
a conventional View reference, such as `booksView`, `booksViews`, or
`booksState.views`. It does not require type information.
