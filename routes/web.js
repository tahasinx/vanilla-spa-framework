// Web Routes
// Define your routes here

// Register custom middleware aliases in middleware/kernel.js
// then reference aliases in route middleware arrays.

// Home routes
AppRouter.get('/', 'HomeController', 'index', { name: 'home', middleware: ['locale'] });
AppRouter.get('/docs', 'HomeController', 'docs', {
    name: 'docs',
    middleware: ['locale'],
    // Single prefetch example (keep most routes simple).
    prefetch: {
        templates: [{ name: 'docs', path: 'resources/views/docs.html' }]
    }
});
AppRouter.get('/middleware-check', 'HomeController', 'index', { name: 'middleware.check', middleware: ['test'] });

// Demo routes
AppRouter.group({ prefix: '/demo', namePrefix: 'demo.' }, () => {
    AppRouter.get('/', 'DemoController', 'index', { name: 'index' });
    AppRouter.get('/about', 'DemoController', 'about', { name: 'about' });
    AppRouter.get('/services', 'DemoController', 'services', { name: 'services' });
    AppRouter.get('/blog', 'DemoController', 'blog', { name: 'blog' });
    AppRouter.get('/blog/{id}', 'DemoController', 'blogView', { name: 'blog.view' });
    AppRouter.get('/contact', 'DemoController', 'contact', { name: 'contact' });
});

// User routes (dummy placeholders)
// These are intentionally commented out because UserController routes are
// documentation/demo placeholders only and should not be executed in this build.
// Uncomment after implementing UserController methods and real data handling.
// AppRouter.get('/users', 'UserController', 'index');
// AppRouter.get('/users/{id}', 'UserController', 'show');
// AppRouter.get('/users/create', 'UserController', 'create');
// AppRouter.post('/users', 'UserController', 'store');
// AppRouter.get('/users/{id}/edit', 'UserController', 'edit');
// AppRouter.put('/users/{id}', 'UserController', 'update');
// AppRouter.delete('/users/{id}', 'UserController', 'destroy');

// API routes
AppRouter.group({ prefix: '/api', namePrefix: 'api.' }, () => {
    AppRouter.get('/users', 'ApiController', 'getUsers', { name: 'users.index' });
    AppRouter.get('/inspire', 'ApiController', 'inspire', { name: 'inspire' });
    AppRouter.get('/demo/stats', 'ApiController', 'getDemoStats', { name: 'demo.stats' });
    AppRouter.post('/demo/contact', 'ApiController', 'submitDemoContact', { name: 'demo.contact.submit' });
    AppRouter.get('/users/{id}', 'ApiController', 'getUser', { name: 'users.show' });
    AppRouter.post('/users', 'ApiController', 'createUser', { name: 'users.store' });
    AppRouter.put('/users/{id}', 'ApiController', 'updateUser', { name: 'users.update' });
    AppRouter.delete('/users/{id}', 'ApiController', 'deleteUser', { name: 'users.delete' });
});

// Blog routes (dummy placeholders)
// These are sample CRUD definitions inspired by Laravel-style routing.
// They are disabled until BlogController is implemented with real logic/views.
// AppRouter.get('/blog', 'BlogController', 'index');
// AppRouter.get('/blog/{id}', 'BlogController', 'show');
// AppRouter.get('/blog/create', 'BlogController', 'create');
// AppRouter.post('/blog', 'BlogController', 'store');

// Admin routes (dummy placeholders)
// These admin examples are kept as reference for future protected routes.
// They remain commented to avoid runtime errors before AdminController exists.
// AppRouter.get('/admin', 'AdminController', 'dashboard');
// AppRouter.get('/admin/users', 'AdminController', 'users');
// AppRouter.get('/admin/posts', 'AdminController', 'posts');

// Catch-all route for 404
AppRouter.get('*', 'ErrorController', 'notFound', { name: 'errors.404' });