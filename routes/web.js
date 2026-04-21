// Web Routes
// Define your routes here

// Home routes
AppRouter.get('/', 'HomeController', 'index');
AppRouter.get('/docs', 'HomeController', 'docs');
AppRouter.get('/demo', 'DemoController', 'index');
AppRouter.get('/demo/about', 'DemoController', 'about');
AppRouter.get('/demo/services', 'DemoController', 'services');
AppRouter.get('/demo/blog', 'DemoController', 'blog');
AppRouter.get('/demo/blog/{id}', 'DemoController', 'blogView');
AppRouter.get('/demo/contact', 'DemoController', 'contact');

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
AppRouter.get('/api/users', 'ApiController', 'getUsers');
AppRouter.get('/api/inspire', 'ApiController', 'inspire');
AppRouter.get('/api/demo/stats', 'ApiController', 'getDemoStats');
AppRouter.post('/api/demo/contact', 'ApiController', 'submitDemoContact');
AppRouter.get('/api/users/{id}', 'ApiController', 'getUser');
AppRouter.post('/api/users', 'ApiController', 'createUser');
AppRouter.put('/api/users/{id}', 'ApiController', 'updateUser');
AppRouter.delete('/api/users/{id}', 'ApiController', 'deleteUser');

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

// Catch-all route for 404 (dummy placeholder)
// Keep this disabled until ErrorController.notFound is created. If enabled now,
// unresolved paths may trigger a missing-controller runtime error.
// AppRouter.get('*', 'ErrorController', 'notFound');