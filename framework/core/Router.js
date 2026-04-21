class Router {
    constructor() {
        this.routes = [];
        this.currentRoute = null;
        this.baseUrl = window.location.origin;
        this.middlewares = {};
        this.groupStack = [];
        this.namedRoutes = {};

        this.registerDefaultMiddlewares();
    }

    // Add a GET route
    get(path, controller, action, options = {}) {
        return this.addRoute('GET', path, controller, action, options);
    }

    // Add a POST route
    post(path, controller, action, options = {}) {
        return this.addRoute('POST', path, controller, action, options);
    }

    // Add a PUT route
    put(path, controller, action, options = {}) {
        return this.addRoute('PUT', path, controller, action, options);
    }

    // Add a DELETE route
    delete(path, controller, action, options = {}) {
        return this.addRoute('DELETE', path, controller, action, options);
    }

    // Register middleware handler by name
    middleware(name, handler) {
        if (!name || typeof handler !== 'function') {
            throw new Error('Middleware requires a name and handler function.');
        }
        this.middlewares[name] = handler;
    }

    // Create route groups with shared options
    group(options = {}, callback = () => {}) {
        this.groupStack.push({
            prefix: options.prefix || '',
            middleware: this.normalizeMiddleware(options.middleware),
            namePrefix: options.namePrefix || options.as || ''
        });

        try {
            callback();
        } finally {
            this.groupStack.pop();
        }
    }

    // Build URL from named route
    route(name, params = {}) {
        const namedRoute = this.namedRoutes[name];
        if (!namedRoute) {
            console.error(`Named route "${name}" not found.`);
            return '/';
        }

        let builtPath = namedRoute.path;
        for (const [key, value] of Object.entries(params)) {
            builtPath = builtPath.replace(new RegExp(`\\{${key}\\}`, 'g'), encodeURIComponent(value));
        }

        return builtPath;
    }

    // Add route with Laravel-like options
    addRoute(method, path, controller, action, options = {}) {
        const groupOptions = this.getMergedGroupOptions();
        const fullPath = this.normalizeRoutePath(groupOptions.prefix, path);
        const middleware = [
            ...groupOptions.middleware,
            ...this.normalizeMiddleware(options.middleware)
        ];
        const routeName = `${groupOptions.namePrefix || ''}${options.name || ''}`;

        const route = {
            method,
            path: fullPath,
            controller,
            action,
            middleware,
            name: routeName || null
        };

        this.routes.push(route);
        if (route.name) {
            this.namedRoutes[route.name] = route;
        }

        return route;
    }

    // Get merged values for nested groups
    getMergedGroupOptions() {
        return this.groupStack.reduce((acc, group) => {
            acc.prefix = this.normalizeRoutePath(acc.prefix, group.prefix || '');
            acc.middleware = [...acc.middleware, ...this.normalizeMiddleware(group.middleware)];
            acc.namePrefix = `${acc.namePrefix}${group.namePrefix || ''}`;
            return acc;
        }, { prefix: '', middleware: [], namePrefix: '' });
    }

    normalizeRoutePath(prefix = '', path = '') {
        const hasWildcard = path === '*';
        if (hasWildcard) {
            return '*';
        }

        const cleanPrefix = String(prefix || '').replace(/^\/+|\/+$/g, '');
        const cleanPath = String(path || '').replace(/^\/+|\/+$/g, '');
        const joined = [cleanPrefix, cleanPath].filter(Boolean).join('/');
        return joined ? `/${joined}` : '/';
    }

    normalizeMiddleware(value) {
        if (!value) {
            return [];
        }
        if (Array.isArray(value)) {
            return value.map((item) => String(item)).filter(Boolean);
        }
        return [String(value)];
    }

    registerDefaultMiddlewares() {
        this.middleware('auth', () => {
            if (window.Auth && typeof window.Auth.check === 'function' && !window.Auth.check()) {
                this.navigate('/');
                return false;
            }
            return true;
        });

        this.middleware('guest', () => {
            if (window.Auth && typeof window.Auth.check === 'function' && window.Auth.check()) {
                this.navigate('/');
                return false;
            }
            return true;
        });
    }

    async runMiddlewares(route, context) {
        const routeMiddlewares = this.normalizeMiddleware(route.middleware);
        for (const middlewareName of routeMiddlewares) {
            const handler = this.middlewares[middlewareName];
            if (typeof handler !== 'function') {
                console.warn(`Middleware "${middlewareName}" is not registered.`);
                continue;
            }

            const result = await handler(context);
            if (result === false) {
                return false;
            }
            if (typeof result === 'string') {
                this.navigate(result);
                return false;
            }
        }

        return true;
    }

    findRoute(path, method = 'GET') {
        const normalizedMethod = String(method).toUpperCase();
        for (let route of this.routes) {
            if (route.method !== normalizedMethod) {
                continue;
            }
            if (this.matchPath(route.path, path)) {
                return route;
            }
        }
        return null;
    }

    hasRoute(path, method = 'GET') {
        return !!this.findRoute(path, method);
    }

    // Resolve controller action and execute it
    async executeRoute(route, params = {}) {
        // Resolve controller class from window
        const ControllerClass = window[route.controller];
        if (typeof ControllerClass !== 'function') {
            throw new Error(`Controller "${route.controller}" not found on window.`);
        }
        const controller = new ControllerClass();
        if (typeof controller[route.action] !== 'function') {
            throw new Error(`Action "${route.action}" not found on controller "${route.controller}".`);
        }
        return controller[route.action](params);
    }

    // Add route helper globally
    registerRouteHelper() {
        window.route = (name, params = {}) => this.route(name, params);
    }

    // Get current path from hash
    getCurrentPath() {
        // Remove leading # and ensure leading /
        let hash = window.location.hash.replace(/^#/, '');
        if (!hash.startsWith('/')) hash = '/' + hash;
        return hash || '/';
    }

    // Match current URL to routes
    match(url) {
        const path = url || this.getCurrentPath();

        for (let route of this.routes) {
            if (this.matchPath(route.path, path)) {
                return route;
            }
        }
        return null;
    }

    // Match path with parameters
    matchPath(routePath, currentPath) {
        if (routePath === '*') {
            return true;
        }

        const routeParts = routePath.split('/').filter(part => part !== '');
        const currentParts = currentPath.split('/').filter(part => part !== '');

        if (routeParts.length !== currentParts.length) {
            return false;
        }

        for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith('{') && routeParts[i].endsWith('}')) {
                // This is a parameter, continue
                continue;
            }
            if (routeParts[i] !== currentParts[i]) {
                return false;
            }
        }

        return true;
    }

    // Extract parameters from URL
    extractParams(routePath, currentPath) {
        const params = {};
        const routeParts = routePath.split('/').filter(part => part !== '');
        const currentParts = currentPath.split('/').filter(part => part !== '');

        for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith('{') && routeParts[i].endsWith('}')) {
                const paramName = routeParts[i].slice(1, -1);
                params[paramName] = currentParts[i];
            }
        }

        return params;
    }

    // Navigate to a route (hash-based)
    navigate(path) {
        if (!path.startsWith('/')) path = '/' + path;
        window.location.hash = path;
    }

    // Handle the current route
    async handleRoute() {
        const path = this.getCurrentPath();
        let route = this.match(path);

        if (!route) {
            route = this.routes.find(r => r.path === '*');
            if (!route) {
                console.error(`Route not found for path "${path}"`);
                return;
            }
        }

        this.currentRoute = route;
        const params = this.extractParams(route.path, path);
        const canContinue = await this.runMiddlewares(route, {
            route,
            path,
            method: 'GET',
            params
        });

        if (!canContinue) {
            return;
        }

        try {
            await this.executeRoute(route, params);
        } catch (error) {
            console.error(error.message);
        }
    }

    // Initialize router (hash-based)
    init() {
        // Handle hash changes
        window.addEventListener('hashchange', () => {
            this.handleRoute().catch((error) => console.error(error));
        });
        // Handle initial route
        this.registerRouteHelper();
        this.handleRoute().catch((error) => console.error(error));
    }

    // Call a route directly (for API-like calls)
    async callRoute(path, method = 'GET', data = {}) {
        const normalizedMethod = String(method).toUpperCase();
        const route = this.findRoute(path, normalizedMethod);
        if (!route) return { status: 404, data: { error: 'Not found' }, type: 'json' };
        const params = this.extractParams(route.path, path);
        const canContinue = await this.runMiddlewares(route, {
            route,
            path,
            method: normalizedMethod,
            params,
            data
        });
        if (!canContinue) {
            return { status: 403, data: { error: 'Forbidden by middleware' }, type: 'json' };
        }

        let result;
        try {
            // Pass both dynamic route params and request payload-like data.
            result = await this.executeRoute(route, { ...params, ...data });
        } catch (error) {
            return { status: 500, data: { error: error.message }, type: 'json' };
        }
        // Auto-detect response type
        if (result && typeof result === 'object' && ('status' in result || 'data' in result)) {
            // Already a response object
            return {
                data: result.data !== undefined ? result.data : result,
                status: result.status !== undefined ? result.status : 200,
                type: typeof result.data === 'string' ? 'html' : 'json'
            };
        } else if (typeof result === 'string') {
            return { data: result, status: 200, type: 'html' };
        } else {
            return { data: result, status: 200, type: 'json' };
        }
    }
}

// Create global AppRouter instance immediately
window.AppRouter = new Router();
// Also create standalone Router functions for easier access
window.RouterGet = (path, controller, action, options = {}) => window.AppRouter.get(path, controller, action, options);
window.RouterPost = (path, controller, action, options = {}) => window.AppRouter.post(path, controller, action, options);
window.RouterPut = (path, controller, action, options = {}) => window.AppRouter.put(path, controller, action, options);
window.RouterDelete = (path, controller, action, options = {}) => window.AppRouter.delete(path, controller, action, options);
// Also create a global Router class reference
window.RouterClass = Router; 