# Vanilla SPA (Single Page Application) Framework

A Laravel-inspired frontend framework built with pure JavaScript. No Node.js required!

## Features

- ✅ **Unified Routing**: All routes (pages, APIs) handled in JS, auto-detects HTML/JSON
- ✅ **Laravel-like Routing**: Define routes similar to Laravel's web.php
- ✅ **Route Groups & Named Routes**: Use `prefix`, `namePrefix`, and `route(name, params)`
- ✅ **Middleware Pipeline**: Add per-route guards like `auth` and `guest`
- ✅ **Validation Layer**: Laravel-like rules for forms via `data-validate`
- ✅ **Service Container & Providers**: Register services and boot providers
- ✅ **Centralized Store**: Lightweight shared state management
- ✅ **Plugin System**: Install app plugins with `App.use(...)`
- ✅ **Template System**: Blade-like syntax (`{{ variable }}`, `@if`, `@foreach`, `@for`, `@extends`, `@section`, `@yield`, `@include`)
- ✅ **API Integration**: Easy API calls with DOM updates
- ✅ **Pure JavaScript**: No build tools or Node.js required
- ✅ **Controller Pattern**: Organize code with controllers
- ✅ **View Rendering**: Template rendering with data binding
- ✅ **Frontend Auth Service**: `Auth.check()`, `Auth.login()`, `Auth.logout()`, `Auth.user()`

## Quick Start

1. **Clone or download** the framework files
2. **Run a local server** (do not use `file://` protocol)
   - Recommended: `python -m http.server 5500 --bind 127.0.0.1`
   - Open: `http://127.0.0.1:5500`
   - Alternative: `python -m http.server 5500` | `vs code live server extensions`
3. **Open `index.html`** in your browser
4. **Start developing** with the included structure

## Project Structure

```
vanilla-spa-framework/
├── index.html                 # Main entry point
├── framework/
│   └── core/
│       ├── Router.js         # Unified route handling (global: AppRouter)
│       ├── Controller.js     # Base controller
│       ├── View.js          # Template rendering
│       ├── Api.js           # API integration
│       ├── Response.js      # Laravel-inspired response() helper
│       ├── Validator.js     # Form/request validation rules
│       ├── FormRequest.js   # Reusable request validation classes
│       ├── ServiceContainer.js
│       ├── ServiceProvider.js
│       ├── Store.js
│       ├── Auth.js          # Frontend auth state service
│       └── App.js           # Main application
├── routes/
│   └── web.js               # Route definitions (all routes go here)
├── controllers/
│   ├── HomeController.js    # Home page controller
│   └── ApiController.js     # API controller
├── providers/
│   └── MetricsProvider.js
├── plugins/
│   └── LoggerPlugin.js
├── tests/
│   ├── run-tests.html
│   ├── test-runner.js
│   └── framework.tests.js
├── cli/
│   └── scaffold.sh
├── CHANGELOG.md
└── resources/
    ├── views/               # Template files
    │   ├── welcome.html
    │   ├── docs.html
    │   └── demo/
    │       ├── home.html
    │       ├── about.html
    │       ├── services.html
    │       ├── blog.html
    │       ├── blog-view.html
    │       ├── contact.html
    │       └── master/layout.html
    └── css/
        └── app.css          # Styles
```

## Demo Layout Example

### 1. **Master Layout** (`resources/views/demo/master/layout.html`)
```html
<!DOCTYPE html>
<html>
<head>
    <title>My App - @yield('title')</title>
</head>
<body>
    <header>
        <h1>My App Header</h1>
    </header>
    <main>
        @yield('content')
    </main>
    <footer>
        <small>Copyright 2024</small>
    </footer>
</body>
</html>
```

### 2. **Demo View** (`resources/views/demo/home.html`)
```html
@extends('demo.layout')
@section('content')
  <h1>{{ pageHeading }}</h1>
@endsection
```

### 3. **Controller Function** (`controllers/DemoController.js`)
```js
class DemoController extends Controller {
    // ...
    async index() {
        await this.view.loadTemplate('demo.layout', 'resources/views/demo/master/layout.html');
        await this.view.loadTemplate('demo_home', 'resources/views/demo/home.html');
        this.view.updateElement('#app', 'demo_home', { pageHeading: 'Surface Deals' });
    }
}
window.DemoController = DemoController;
```

### 4. **Route** (`routes/web.js`)
```js
AppRouter.get('/demo', 'DemoController', 'index');
```

**Now, visiting `/#/demo` renders the demo page using the demo master layout.**

---

## More Features, API, and Template Syntax

## Routing

**All routes should be defined in `routes/web.js` using the global `AppRouter`.**

```javascript
// routes/web.js
AppRouter.get('/', 'HomeController', 'index', { name: 'home' });
AppRouter.get('/docs', 'HomeController', 'docs', { name: 'docs' });

AppRouter.group({ prefix: '/demo', namePrefix: 'demo.' }, () => {
    AppRouter.get('/', 'DemoController', 'index', { name: 'index' });
    AppRouter.get('/blog/{id}', 'DemoController', 'blogView', { name: 'blog.view' });
});

AppRouter.group({ prefix: '/api', namePrefix: 'api.' }, () => {
    AppRouter.get('/inspire', 'ApiController', 'inspire', { name: 'inspire' });
});
```

> Do **not** define routes in `index.html`. Keep all your route definitions in `routes/web.js` for a clean, Laravel-style structure.

### Named Route Helper

```javascript
const blogDetailsUrl = route('demo.blog.view', { id: 7 }); // "/demo/blog/7"
window.AppRouter.navigate(blogDetailsUrl);
```

### Middleware

```javascript
AppRouter.get('/dashboard', 'DashboardController', 'index', {
    name: 'dashboard',
    middleware: ['auth']
});

AppRouter.get('/login', 'AuthController', 'login', {
    name: 'login',
    middleware: ['guest']
});
```

- Built-in middleware: `auth`, `guest`
- Register custom middleware: `AppRouter.middleware('name', (context) => true | false | '/redirect')`

### Frontend Auth Service

```javascript
Auth.login({ name: 'Demo User', role: 'member' });
Auth.check(); // true
Auth.user();  // { name: 'Demo User', role: 'member' }
Auth.logout();
```

## Controllers

Create controllers in the `controllers/` directory and expose them globally:

```javascript
class ApiController extends Controller {
    // Example: Return JSON from an external API
    async inspire() {
        try {
            const response = await fetch('https://dummyjson.com/products');
            const json = await response.json();
            return response().json({ products: json }, 200);
        } catch (error) {
            return response().error('Failed to fetch external API', 502);
        }
    }
}
window.ApiController = ApiController;
```

- If your controller returns a string, it is treated as HTML.
- If it returns an object/array, it is treated as JSON.
- If it returns `{status, data, type}`, it is treated as a full response.

Laravel-inspired response helper:

```javascript
response().json({ ok: true }, 200);
response().html('<strong>Saved</strong>', 200);
response().error('Validation failed', 422);
```

## Container, Providers, and Plugins

```javascript
class MetricsProvider extends ServiceProvider {
  register() {
    window.Container.singleton('metrics', () => ({
      track: (eventName) => console.log('track', eventName)
    }));
  }
}

App.registerProvider(MetricsProvider);

App.use({
  install() {
    console.log('Plugin installed');
  }
});
```

Real sample files are included:

- `providers/MetricsProvider.js`
- `plugins/LoggerPlugin.js`

Resolve services later:

```javascript
const metrics = window.Container.make('metrics');
metrics.track('docs-viewed');
```

## Templates

Create templates in `resources/views/` with Laravel-like syntax:

```html
<!-- welcome.html -->
<div class="container">
    <h1>{{ title }}</h1>
    @foreach(users as user)
    <div class="user">
        <h3>{{ user }}</h3>
    </div>
    @endforeach
    @if(showButton)
    <button>Click me</button>
    @endif
    @for(let i=1;i<=10;i++)
    <span>Loop index: ${i}</span>
    @endfor
</div>
```

**Note:** For `@for` loops, use `${i}` for loop variables inside the loop body. Use `{{ variable }}` for data context variables elsewhere. This is the most robust and JS-like approach for frontend template engines.

By default, `{{ variable }}` is HTML-escaped (safe output). Use `{!! variable !!}` only for trusted HTML fragments.

## API Integration

Make API calls and update DOM elements:

```javascript
// In controller
async loadInspiration() {
    const response = await this.api.get('/api/inspire');
    alert(response.data.quote);
}

// Or directly in HTML
<button data-api-url="/api/inspire" data-target="#api-result">
    Load Inspiration
</button>
```

JSON responses are now rendered as pretty-printed blocks in target elements for readability.
For long payloads, set a bounded response container:

```css
.api-result {
  max-height: 320px;
  overflow: auto;
}
```

## External API & CORS Issues

**Browsers block frontend JS from reading data from other domains unless the server allows it (CORS).**

- If you fetch an external API (like `https://google.com/favicon.ico`) and it does not send `Access-Control-Allow-Origin`, you will get a CORS error.
- **You cannot bypass CORS in frontend JS.**
- For APIs you do not control, use a CORS proxy for development/testing:
  - Example: `https://corsproxy.io/?https://eod365.com/run/39/inspire`
- For production, use your own backend or only APIs that support CORS.

**More info:** [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

## Template Syntax

### Variables
```html
<h1>{{ title }}</h1>
<p>{{ user.name }}</p>
```

### Conditionals
```html
@if(user.isAdmin)
<div class="admin-panel">Admin Content</div>
@endif

@if(user.isPremium)
<div class="premium">Premium Content</div>
@else
<div class="basic">Basic Content</div>
@endif
```

### Loops
```html
@foreach(users as user)
<div class="user-card">
    <h3>{{ user.name }}</h3>
    <p>{{ user.email }}</p>
</div>
@endforeach

@for(let i=1;i<=5;i++)
  <div>Index: ${i}</div>
@endfor
```

## API Methods

```javascript
// GET request
const response = await this.api.get('/api/users');

// POST request
const response = await this.api.post('/api/users', { name: 'John' });

// Update DOM with API response
this.api.updateElement('#users', '/api/users');

// Render template with API data
this.api.renderTemplate('#users', 'user-list', '/api/users');
```

## Form Handling

```html
<form data-action="/api/users" data-method="POST" data-target="#result">
    <input type="text" name="name" required>
    <input type="email" name="email" required>
    <button type="submit">Submit</button>
</form>
<div id="result"></div>
```

For real-time field feedback, enable live validation:

```html
<form
  data-action="/api/users"
  data-method="POST"
  data-target="#result"
  data-validate-live="true"
  data-validate-debounce="250"
  data-validate='{"name":"required|min:3","email":"required|email"}'
>
  <input type="text" name="name" />
  <input type="email" name="email" />
  <button type="submit">Submit</button>
</form>
```

`data-validate-debounce` is optional (milliseconds) and defaults to `250`.
For live-only demos, you can remove the submit button and keep a muted response placeholder (for example: `Response`).

## Validation

Add Laravel-like validation rules directly on forms:

```html
<form
  data-action="/api/users"
  data-method="POST"
  data-target="#result"
  data-validate='{"name":"required|min:3|max:40","email":"required|email"}'
  data-validate-messages='{"name.required":"Please enter your name"}'
>
  <input type="text" name="name" />
  <input type="email" name="email" />
  <button type="submit">Submit</button>
</form>
<div id="result"></div>
```

When validation fails, the framework:

- Stops API submission
- Dispatches `form-error` with validation details
- Renders field errors into your `data-target` element
- Renders first validation error below each input field

Programmatic usage:

```javascript
const result = Validator.validate(
  { email: 'john@example.com' },
  { email: 'required|email' }
);

if (result.fails) {
  console.log(result.errors);
}
```

Supported rules: `required`, `email`, `min`, `max`, `numeric`, `url`, `in`.

FormRequest-style usage:

```javascript
class DemoSignupRequest extends FormRequest {
  rules() {
    return {
      name: 'required|min:3',
      email: 'required|email'
    };
  }

  messages() {
    return {
      'name.required': 'Name is required.'
    };
  }
}
window.DemoSignupRequest = DemoSignupRequest;
```

```html
<form data-request="DemoSignupRequest" data-target="#result"></form>
```

## Centralized Store

```javascript
window.AppStore.setState({ user: { name: 'Dev' } });
const state = window.AppStore.getState();

const unsubscribe = window.AppStore.subscribe((nextState) => {
  console.log('Store changed', nextState);
});
```

## Test Suite

Open `tests/run-tests.html` in your local server to run framework unit tests.
Current tests cover validator, router named routes, store updates, and container singleton behavior.

## CLI Scaffolding

Use the scaffold script to generate boilerplate files:

```bash
./cli/scaffold.sh controller ProfileController
./cli/scaffold.sh view profile
./cli/scaffold.sh request CreateProfileRequest
```

## Configuration

Configure the app in your main script:

```javascript
// Configure API base URL
App.config({
    apiUrl: 'https://api.example.com',
    debug: true
});
```

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Development

1. **Add new routes** in `routes/web.js` only
2. **Create controllers** in `controllers/` and expose them globally
3. **Add templates** in `resources/views/`
4. **Style with CSS** in `resources/css/`

## License

MIT License - feel free to use in your projects! 