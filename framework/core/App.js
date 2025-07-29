class App {
    constructor() {
        // No need to create new instances, use global ones
    }

    // Initialize the application
    static init() {
        window.App = new App();
        window.View = window.View || new View();
        window.Api = window.Api || new Api();

        // Initialize router
        window.AppRouter.init();

        // Set up global error handling
        App.setupErrorHandling();

        // Set up global event listeners
        App.setupEventListeners();

        console.log('Custom Framework initialized');
    }

    // Configure the application
    static config(options) {
        if (!window.App) {
            window.App = new App();
        }
        App.config = { ...App.config, ...options };

        if (App.config.apiUrl) {
            window.Api.setBaseUrl(App.config.apiUrl);
        }
    }

    // Setup global error handling
    static setupErrorHandling() {
        window.addEventListener('error', (event) => {
            if (App.config && App.config.debug) {
                console.error('Global error:', event.error);
            }
        });

        window.addEventListener('unhandledrejection', (event) => {
            if (App.config && App.config.debug) {
                console.error('Unhandled promise rejection:', event.reason);
            }
        });
    }

    // Setup global event listeners
    static setupEventListeners() {
        // Handle form submissions
        document.addEventListener('submit', (event) => {
            const form = event.target;
            const action = form.getAttribute('data-action');
            const method = form.getAttribute('data-method') || 'POST';

            if (action) {
                event.preventDefault();
                App.handleFormSubmission(form, action, method);
            }
        });

        // Handle link clicks
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a');
            if (link && link.getAttribute('data-route')) {
                event.preventDefault();
                const route = link.getAttribute('data-route');
                window.AppRouter.navigate(route);
            }
        });

        // Handle API update triggers
        document.addEventListener('click', (event) => {
            const element = event.target;
            const apiUrl = element.getAttribute('data-api-url');
            const targetSelector = element.getAttribute('data-target');

            if (apiUrl && targetSelector) {
                event.preventDefault();
                window.Api.updateElement(targetSelector, apiUrl);
            }
        });
    }

    // Handle form submission
    static async handleFormSubmission(form, action, method) {
        try {
            const formData = new FormData(form);
            const data = {};

            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }

            let response;
            switch (method.toUpperCase()) {
                case 'GET':
                    response = await window.Api.get(action, { data });
                    break;
                case 'POST':
                    response = await window.Api.post(action, data);
                    break;
                case 'PUT':
                    response = await window.Api.put(action, data);
                    break;
                case 'DELETE':
                    response = await window.Api.delete(action, { data });
                    break;
                default:
                    response = await window.Api.post(action, data);
            }

            // Handle response
            const targetSelector = form.getAttribute('data-target');
            if (targetSelector) {
                const element = document.querySelector(targetSelector);
                if (element) {
                    if (typeof response.data === 'string') {
                        element.innerHTML = response.data;
                    } else {
                        element.innerHTML = JSON.stringify(response.data);
                    }
                }
            }

            // Trigger success event
            form.dispatchEvent(new CustomEvent('form-success', { detail: response }));

        } catch (error) {
            console.error('Form submission failed:', error);
            form.dispatchEvent(new CustomEvent('form-error', { detail: error }));
        }
    }

    // Register a component
    static registerComponent(name, component) {
        window[name] = component;
    }

    // Register a helper function
    static registerHelper(name, fn) {
        window[name] = fn;
    }

    // Debug mode
    static debug(enabled = true) {
        if (!window.App) {
            window.App = new App();
        }
        App.config.debug = enabled;
        console.log('Debug mode:', enabled ? 'enabled' : 'disabled');
    }
} 