class Controller {
    constructor() {
        this.view = new View();
        this.api = new Api();
    }

    // Render a view
    render(viewName, data = {}) {
        return this.view.render(viewName, data);
    }

    // Redirect to another route
    redirect(path) {
        Router.navigate(path);
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