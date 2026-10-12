# RTK Books

RTK Books is a direct Redux Toolkit counterpart to EVST RTK Books. Both examples
share the same Material UI, routes, demo login, idle logout, Google Books service,
and collection behavior. This version uses Redux Toolkit directly and does not
depend on `@evst/rtk`.

## Running the example

From the repository root:

```sh
npm run serve:rtk-books
npm run build:rtk-books
npm run test:rtk-books
```

Demo login accepts usernames `ngrx` or `test`; passwords are not validated.
Authentication is simulated and resets on reload. Five minutes of inactivity
signs out the user.

## RTK implementation

- `createSlice` defines auth, core, and lazy Books reducers.
- `configureStore` combines auth and core reducers at startup and installs
  listener middleware.
- A reducer manager injects the Books reducer when the lazy route loads.
- Listener middleware handles login, Google Books requests, and collection
  persistence. Selector functions derive values used by components.
- React components use `useSelector` and `useDispatch` directly.

The app-level debounce and latest-result helpers match the EVST RTK Books example.
In-flight requests are not aborted; superseded results are ignored. Saved
collection data is stored in localStorage and is not partitioned by demo user.
