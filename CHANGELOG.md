# Changelog

## 2026-04-21

### Added

- Laravel-like route groups, named routes, and middleware pipeline.
- Frontend auth service (`Auth`) with `check/login/logout/user`.
- Centralized framework error handling with custom `403/404/500` views.
- Validation engine with rule-based checks and custom messages.
- Live validation with debounce and per-field error messages.
- FormRequest-style reusable validation classes.
- Pretty-printed API response rendering in docs/demo targets.
- Service container and service provider foundations.
- Plugin installation lifecycle via `App.use(...)`.
- Centralized app store (`AppStore`) for shared state.
- Lightweight browser test suite (`tests/run-tests.html`).
- CLI scaffolding tool (`cli/scaffold.sh`) for controller/view/request boilerplate.
- Sample `MetricsProvider` and `LoggerPlugin` wired into startup.

### Updated

- README and in-app docs expanded with platform features, validation, and testing guidance.
- Docs code blocks now support syntax highlighting.
- Error page UI simplified to minimal centered status style.
