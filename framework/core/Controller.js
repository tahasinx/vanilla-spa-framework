class Controller {
    constructor() {
        this.view = window.View || (window.View = new View());
        this.api = window.Api || (window.Api = new Api());
    }

    // Render a view
    render(viewName, data = {}) {
        return this.view.render(viewName, data);
    }

    // Redirect to another route
    redirect(path) {
        if (window.AppRouter && typeof window.AppRouter.navigate === 'function') {
            window.AppRouter.navigate(path);
            return;
        }
        console.error('Router is not initialized');
    }

    // Return JSON response
    json(data) {
        return JSON.stringify(data);
    }

    // Return API response
    apiResponse(data, status = 200) {
        return {
            data: data,
            status: status
        };
    }

    // Get request data
    getRequestData() {
        const urlParams = new URLSearchParams(window.location.search);
        const data = {};

        for (let [key, value] of urlParams) {
            data[key] = value;
        }

        return data;
    }

    // Get POST data (for form submissions)
    getPostData() {
        // This would be implemented for form handling
        return {};
    }
} 