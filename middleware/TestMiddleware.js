window.AppRouter.middleware('TestMiddleware', (context) => {
    // Return true to continue, false to block, or '/path' to redirect.
    return true;
});
