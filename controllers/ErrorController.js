class ErrorController extends Controller {
    async notFound(context = {}) {
        const data = this.buildErrorData(404, 'Page Not Found', context);
        await this.renderErrorView('errors.404', 'resources/views/errors/404.html', data);
    }

    async forbidden(context = {}) {
        const data = this.buildErrorData(403, 'Forbidden', context);
        await this.renderErrorView('errors.403', 'resources/views/errors/403.html', data);
    }

    async serverError(context = {}) {
        const data = this.buildErrorData(500, 'Server Error', context);
        await this.renderErrorView('errors.500', 'resources/views/errors/500.html', data);
    }

    buildErrorData(status, title, context = {}) {
        const isDebug = !!(window.App && window.App.config && window.App.config.debug);
        return {
            status,
            title,
            message: context.message || 'Something went wrong while processing this request.',
            path: context.path || (window.AppRouter ? window.AppRouter.getCurrentPath() : '/'),
            type: context.type || 'UNKNOWN_ERROR',
            debugDetails: isDebug ? JSON.stringify({
                route: context.route || null,
                type: context.type || null,
                message: context.message || null
            }, null, 2) : ''
        };
    }

    async renderErrorView(templateName, templatePath, data) {
        if (!this.view.templates[templateName]) {
            await this.view.loadTemplate(templateName, templatePath);
        }
        this.view.updateElement('#app', templateName, data);
    }
}

window.ErrorController = ErrorController;
