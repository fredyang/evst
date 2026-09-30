# Books service example

`svc-books` preserves the book-collection UI while replacing NgRx with Angular services, signals, and RxJS.

Feature services own their state and expose read-only signals to components. Components issue direct commands such as `books.search(query)` and `session.login(credentials)`. HTTP and local-storage work remains in RxJS services.

## Running the application

```bash
npm run serve:svc-books
```

The application is served at [http://localhost:4203](http://localhost:4203). The accepted username is `test` or `ngrx`; the password is not validated.
