// Middleware Kernel (Laravel-inspired):
// Central place to register middleware aliases.
(function registerMiddlewareKernel() {
    if (!window.AppRouter || typeof window.AppRouter.middleware !== 'function') {
        console.warn('Middleware kernel could not run: AppRouter is unavailable.');
        return;
    }

    const routeMiddleware = {
        test: window.TestMiddleware
    };

    Object.entries(routeMiddleware).forEach(([alias, handler]) => {
        if (typeof handler === 'function') {
            window.AppRouter.middleware(alias, handler);
        } else {
            console.warn(`Middleware "${alias}" is not a valid function.`);
        }
    });
})();
