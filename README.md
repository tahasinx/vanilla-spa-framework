# Vanilla SPA (Single Page Application) Framework

A Laravel-inspired frontend framework built with pure JavaScript. No Node.js required!

## Features

- ✅ **Unified Routing**: All routes (pages, APIs) handled in JS, auto-detects HTML/JSON
- ✅ **Laravel-like Routing**: Define routes similar to Laravel's web.php
- ✅ **Template System**: Blade-like syntax (`{{ variable }}`, `@if`, `@foreach`, `@for`, `@extends`, `@section`, `@yield`, `@include`)
- ✅ **API Integration**: Easy API calls with DOM updates
- ✅ **Pure JavaScript**: No build tools or Node.js required
- ✅ **Controller Pattern**: Organize code with controllers
- ✅ **View Rendering**: Template rendering with data binding

## Quick Start

1. **Clone or download** the framework files
2. **Run a local server** (do not use `file://` protocol)
   - Example: `python -m http.server 5500` | `vs code live server extensions`
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
│       └── App.js           # Main application
├── routes/
│   └── web.js               # Route definitions (all routes go here)
├── controllers/
│   ├── HomeController.js    # Home page controller
│   └── ApiController.js     # API controller
└── resources/
    ├── views/               # Template files
    │   ├── home.html
    │   ├── about.html
    │   ├── contact.html
    │   └── master/
    │       ├── layout.html
    │       ├── blade.html
    │       └── alert.html
    └── css/
        └── app.css          # Styles
```

## Blade-like Layout Example

### 1. **Master Layout** (`resources/views/master/layout.html`)
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

### 2. **Partial Include** (`resources/views/master/alert.html`)
```html
<div class="alert">
    <strong>{{ message }}</strong>
</div>
```

### 3. **Blade View** (`resources/views/master/blade.html`)
```html
@extends('layout')
@section('title')
Blade Template Engine
@endsection

@section('content')
  <h2>Blade Page</h2>
  <p>This is the blade page content. That is inspired by Laravel like template engine.</p>
  @include('alert')
@endsection
```

### 4. **Controller Function** (`controllers/HomeController.js`)
```js
class HomeController extends Controller {
    // ...
    async blade() {
        await this.view.loadTemplate('layout', 'resources/views/master/layout.html');
        await this.view.loadTemplate('blade', 'resources/views/master/blade.html');
        await this.view.loadTemplate('alert', 'resources/views/master/alert.html');
        this.view.updateElement('#app', 'blade', { message: 'This is an included alert!' });
    }
}
window.HomeController = HomeController;
```

### 5. **Route** (`routes/web.js`)
```js
AppRouter.get('/blade', 'HomeController', 'blade');
```

**Now, visiting `/#/blade` will render the blade page using the master layout, with a section for the title, a section for the content, and an included alert partial.**

---

## More Features, API, and Template Syntax

## Routing

**All routes should be defined in `routes/web.js` using the global `AppRouter`.**

```javascript
// routes/web.js
AppRouter.get('/', 'HomeController', 'index');
AppRouter.get('/about', 'HomeController', 'about');
AppRouter.get('/contact', 'HomeController', 'contact');
AppRouter.get('/api/inspire', 'ApiController', 'inspire'); // Example API route
// ...add more routes as needed
```

> Do **not** define routes in `index.html`. Keep all your route definitions in `routes/web.js` for a clean, Laravel-style structure.

## Controllers

Create controllers in the `controllers/` directory and expose them globally:

```javascript
class ApiController extends Controller {
    // Example: Return JSON from an external API
    async inspire() {
        try {
            const response = await fetch('https://dummyjson.com/products');
            const text = await response.text();
            return { quote: text };
        } catch (error) {
            return { error: 'Failed to fetch external API' };
        }
    }
}
window.ApiController = ApiController;
```

- If your controller returns a string, it is treated as HTML.
- If it returns an object/array, it is treated as JSON.
- If it returns `{status, data}`, it is treated as a full response.

## Templates

Create templates in `resources/views/` with Laravel-like syntax:

```html
<!-- home.html -->
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