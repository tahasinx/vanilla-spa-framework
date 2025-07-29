class Router {
    constructor() {
        this.routes = [];
        this.currentRoute = null;
        this.baseUrl = window.location.origin;
    }

    // Add a GET route
    get(path, controller, action) {
        this.routes.push({
            method: 'GET',
            path: path,
            controller: controller,
            action: action
        });
    }

    // Add a POST route
    post(path, controller, action) {
        this.routes.push({
            method: 'POST',
            path: path,
            controller: controller,
            action: action
        });
    }

    // Add a PUT route
    put(path, controller, action) {
        this.routes.push({
            method: 'PUT',
            path: path,
            controller: controller,
            action: action
        });
    }

    // Add a DELETE route
    delete(path, controller, action) {
        this.routes.push({
            method: 'DELETE',
            path: path,
            controller: controller,
            action: action
        });
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
    handleRoute() {
        const path = this.getCurrentPath();
        const route = this.match(path);

        if (!route) {
            console.error('Route not found');
            return;
        }

        this.currentRoute = route;
        const params = this.extractParams(route.path, path);

        // Resolve controller class from window
        const ControllerClass = window[route.controller];
        if (typeof ControllerClass !== 'function') {
            console.error(`Controller "${route.controller}" not found on window.`);
            return;
        }
        const controller = new ControllerClass();
        controller[route.action](params);
    }

    // Initialize router (hash-based)
    init() {
        // Handle hash changes
        window.addEventListener('hashchange', () => {
            this.handleRoute();
        });
        // Handle initial route
        this.handleRoute();
    }

    // Call a route directly (for API-like calls)
    async callRoute(path, method = 'GET', data = {}) {
        const route = this.routes.find(r => r.path === path && r.method === method);
        if (!route) return { status: 404, data: { error: 'Not found' }, type: 'json' };

        const ControllerClass = window[route.controller];
        if (typeof ControllerClass !== 'function') {
            return { status: 500, data: { error: 'Controller not found' }, type: 'json' };
        }
        const controller = new ControllerClass();
        if (typeof controller[route.action] !== 'function') {
            return { status: 500, data: { error: 'Action not found' }, type: 'json' };
        }
        // Pass data as params for API routes
        let result = await controller[route.action](data);
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
window.RouterGet = (path, controller, action) => window.AppRouter.get(path, controller, action);
window.RouterPost = (path, controller, action) => window.AppRouter.post(path, controller, action);
window.RouterPut = (path, controller, action) => window.AppRouter.put(path, controller, action);
window.RouterDelete = (path, controller, action) => window.AppRouter.delete(path, controller, action);
// Also create a global Router class reference
window.RouterClass = Router; 