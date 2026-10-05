# Reporting unused state views

The rule reports an `extraViews()` property when no statically named reference to
the exported `*.views` object exists in the TypeScript program.

```ts
export const authState = state("auth", initialState).extraViews(() => ({
  user: view((state) => state.user), // Reported
  loggedIn: view((state) => Boolean(state.user)),
}));

export const authViews = authState.views;

authViews.loggedIn.signal();
```

The rule is a suggestion. Dynamic property access, such as `authViews[name]`,
suppresses reporting for that views object because static analysis cannot
determine which views it uses.
