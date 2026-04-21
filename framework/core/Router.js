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
            name: routeName || null,
            prefetch: options.prefetch || null
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

    async prefetchRouteAssets(route) {
        if (!route || !route.prefetch || !window.View) {
            return;
        }

        const templates = Array.isArray(route.prefetch.templates) ? route.prefetch.templates : [];
        for (const template of templates) {
            if (!template || !template.name || !template.path) {
                continue;
            }

            if (window.View.templates && window.View.templates[template.name]) {
                continue;
            }

            try {
                await window.View.loadTemplate(template.name, template.path);
            } catch (error) {
                console.warn(`Failed to prefetch template "${template.name}"`, error);
            }
        }
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
            const error = new Error(`Controller "${route.controller}" not found on window.`);
            error.code = 'CONTROLLER_NOT_FOUND';
            error.status = 500;
            throw error;
        }
        const controller = new ControllerClass();
        if (typeof controller[route.action] !== 'function') {
            const error = new Error(`Action "${route.action}" not found on controller "${route.controller}".`);
            error.code = 'ACTION_NOT_FOUND';
            error.status = 500;
            throw error;
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
        let route = this.findRoute(path, 'GET');

        if (!route) {
            await this.handleFrameworkError({
                type: 'ROUTE_NOT_FOUND',
                status: 404,
                message: `Route not found for path "${path}"`,
                path
            });
            return;
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
            await this.handleFrameworkError({
                type: 'MIDDLEWARE_BLOCKED',
                status: 403,
                message: `Access blocked by middleware for path "${path}"`,
                path,
                route
            });
            return;
        }

        try {
            await this.prefetchRouteAssets(route);
            await this.executeRoute(route, params);
        } catch (error) {
            await this.handleFrameworkError({
                type: error.code || 'ROUTE_EXECUTION_ERROR',
                status: error.status || 500,
                message: error.message,
                path,
                route,
                originalError: error
            });
        }
    }

    async handleFrameworkError(errorContext = {}) {
        const context = {
            type: errorContext.type || 'UNKNOWN_ERROR',
            status: errorContext.status || 500,
            message: errorContext.message || 'An unexpected error occurred.',
            path: errorContext.path || this.getCurrentPath(),
            route: errorContext.route || null,
            originalError: errorContext.originalError || null
        };

        if (window.App && window.App.config && window.App.config.debug) {
            console.error('Framework error context:', context);
        } else {
            console.error(context.message);
        }

        const ErrorControllerClass = window.ErrorController;
        if (typeof ErrorControllerClass === 'function') {
            const errorController = new ErrorControllerClass();
            try {
                if (context.status === 404 && typeof errorController.notFound === 'function') {
                    await errorController.notFound(context);
                    return;
                }
                if (context.status === 403 && typeof errorController.forbidden === 'function') {
                    await errorController.forbidden(context);
                    return;
                }
                if (typeof errorController.serverError === 'function') {
                    await errorController.serverError(context);
                    return;
                }
            } catch (renderError) {
                console.error('Failed to render ErrorController view:', renderError);
            }
        }

        this.renderFallbackError(context);
    }

    renderFallbackError(context = {}) {
        const target = document.querySelector('#app');
        if (!target) {
            return;
        }

        const safeMessage = String(context.message || 'Unexpected error');
        target.innerHTML = `
            <div style="max-width:760px;margin:48px auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;font-family:Arial,sans-serif;">
                <h1 style="margin:0 0 12px;font-size:24px;">Error ${context.status || 500}</h1>
                <p style="margin:0 0 8px;color:#374151;">${safeMessage}</p>
                <p style="margin:0 0 16px;color:#6b7280;">Path: ${context.path || '/'}</p>
                <a href="/#/" data-route="/" style="color:#2563eb;text-decoration:none;">Back to Home</a>
            </div>
        `;
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
        // Prefer explicit response type from response() helper when present.
        if (result && typeof result === 'object' && ('status' in result || 'data' in result)) {
            // Already a response object
            const resolvedData = result.data !== undefined ? result.data : result;
            const explicitType = result.type === 'html' || result.type === 'json' ? result.type : null;
            return {
                data: resolvedData,
                status: result.status !== undefined ? result.status : 200,
                type: explicitType || (typeof resolvedData === 'string' ? 'html' : 'json')
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