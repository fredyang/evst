# @ngrx example application

Example application utilizing @ngrx libraries, showcasing common patterns and best practices. Try it on [StackBlitz](https://ngrx.github.io/platform/stackblitz.html).

This app is a book collection manager. The user can authenticate, use the Google Books API to search for
books and add them to their collection. This application utilizes [@ngrx/store](https://ngrx.io/guide/store) to manage
the state of the app and to cache requests made to the Google Books API;
[@ngrx/effects](https://ngrx.io/guide/effects) to isolate side effects; [@angular/router](https://angular.dev/guide/routing) to manage navigation between routes; [@angular/material](https://github.com/angular/material2) to provide design and styling.

Built with [@angular/cli](https://github.com/angular/angular-cli)

### Included

- [@ngrx/store](https://ngrx.io/guide/store) - RxJS powered state management for Angular apps, inspired by Redux
- [@ngrx/effects](https://ngrx.io/guide/effects) - Side effect model for @ngrx/store
- [@ngrx/router-store](https://ngrx.io/guide/router-store) - Bindings to connect the Angular Router to @ngrx/store
- [@ngrx/entity](https://ngrx.io/guide/entity) - Entity State adapter for managing record collections.
- [@ngrx/store-devtools](https://ngrx.io/guide/store-devtools) - Instrumentation for @ngrx/store enabling time-travel debugging
- [@angular/router](https://angular.dev/guide/routing) - Angular Router
- [@angular/material](https://material.angular.io) - Angular Material
- [vitest](https://vitest.dev) - JavaScript test runner with easy setup, isolated browser testing and snapshot testing

### Running locally

From the `ngrx-sugar` workspace root:

```bash
npm install
npm run build --workspace @ngrx-sugar/store
npm start --workspace ngrx-store-example-app
```

The app runs at [http://localhost:4200/](http://localhost:4200/). The login username and password are both `test`.

Event definitions use `events(source, definitions)` from
[`@ngrx-sugar/store`](../store/README.md#creating-events), with camelCase keys and
readable action labels. Reducer and effect test annotations use its `Event` type.

### Try it on StackBlitz

Try the example-app on [StackBlitz](https://ngrx.github.io/platform/stackblitz.html).
