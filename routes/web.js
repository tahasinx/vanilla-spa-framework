// Web Routes
// Define your routes here

// Home routes
AppRouter.get('/', 'HomeController', 'index');
AppRouter.get('/docs', 'HomeController', 'docs');
AppRouter.get('/about', 'HomeController', 'about');
AppRouter.get('/contact', 'HomeController', 'contact');
AppRouter.get('/blade', 'HomeController', 'blade');
AppRouter.get('/demo', 'DemoController', 'index');
AppRouter.get('/demo/about', 'DemoController', 'about');
AppRouter.get('/demo/services', 'DemoController', 'services');
AppRouter.get('/demo/blog', 'DemoController', 'blog');
AppRouter.get('/demo/blog/{id}', 'DemoController', 'blogView');
AppRouter.get('/demo/contact', 'DemoController', 'contact');

// User routes
AppRouter.get('/users', 'UserController', 'index');
AppRouter.get('/users/{id}', 'UserController', 'show');
AppRouter.get('/users/create', 'UserController', 'create');
AppRouter.post('/users', 'UserController', 'store');
AppRouter.get('/users/{id}/edit', 'UserController', 'edit');
AppRouter.put('/users/{id}', 'UserController', 'update');
AppRouter.delete('/users/{id}', 'UserController', 'destroy');

// API routes
AppRouter.get('/api/users', 'ApiController', 'getUsers');
AppRouter.get('/api/inspire', 'ApiController', 'inspire');
AppRouter.get('/api/demo/stats', 'ApiController', 'getDemoStats');
AppRouter.post('/api/demo/contact', 'ApiController', 'submitDemoContact');
AppRouter.get('/api/users/{id}', 'ApiController', 'getUser');
AppRouter.post('/api/users', 'ApiController', 'createUser');
AppRouter.put('/api/users/{id}', 'ApiController', 'updateUser');
AppRouter.delete('/api/users/{id}', 'ApiController', 'deleteUser');

// Blog routes
AppRouter.get('/blog', 'BlogController', 'index');
AppRouter.get('/blog/{id}', 'BlogController', 'show');
AppRouter.get('/blog/create', 'BlogController', 'create');
AppRouter.post('/blog', 'BlogController', 'store');

// Admin routes
AppRouter.get('/admin', 'AdminController', 'dashboard');
AppRouter.get('/admin/users', 'AdminController', 'users');
AppRouter.get('/admin/posts', 'AdminController', 'posts');

// Catch-all route for 404
AppRouter.get('*', 'ErrorController', 'notFound'); 