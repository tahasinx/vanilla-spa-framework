class Api {
    constructor() {
        this.baseUrl = '';
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    // Set base URL for API calls
    setBaseUrl(url) {
        this.baseUrl = url;
    }

    // Set default headers
    setHeaders(headers) {
        this.defaultHeaders = { ...this.defaultHeaders, ...headers };
    }

    // Make a GET request
    async get(url, options = {}) {
        return this.request('GET', url, options);
    }

    // Make a POST request
    async post(url, data = {}, options = {}) {
        return this.request('POST', url, { ...options, data });
    }

    // Make a PUT request
    async put(url, data = {}, options = {}) {
        return this.request('PUT', url, { ...options, data });
    }

    // Make a DELETE request
    async delete(url, options = {}) {
        return this.request('DELETE', url, options);
    }

    // Make a PATCH request
    async patch(url, data = {}, options = {}) {
        return this.request('PATCH', url, { ...options, data });
    }

    // Core request method
    async request(method, url, options = {}) {
        // Check if this is a local route handled by the router
        const localRoute = window.AppRouter.routes.find(r => r.path === url && r.method === method);
        if (localRoute) {
            // Call the controller action directly
            const result = await window.AppRouter.callRoute(url, method, options.data || {});
            return {
                data: result.data,
                status: result.status,
                type: result.type,
                headers: {},
                ok: result.status >= 200 && result.status < 300
            };
        }

        // Otherwise, do a real network request
        const fullUrl = url.startsWith('http') ? url : this.baseUrl + url;
        const config = {
            method: method,
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };

        // Add body for requests that need it
        if (['POST', 'PUT', 'PATCH'].includes(method) && options.data) {
            config.body = JSON.stringify(options.data);
        }

        try {
            const response = await fetch(fullUrl, config);
            const contentType = response.headers.get('content-type');
            let data;
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return {
                data: data,
                status: response.status,
                headers: response.headers,
                ok: response.ok
            };
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Update DOM element with API response
    async updateElement(selector, url, options = {}) {
        try {
            const response = await this.get(url, options);
            const element = document.querySelector(selector);

            if (element) {
                if (response.type === 'html') {
                    element.innerHTML = response.data;
                } else if (typeof response.data === 'string') {
                    element.innerHTML = response.data;
                } else {
                    element.innerHTML = JSON.stringify(response.data);
                }
            }

            return response;
        } catch (error) {
            console.error('Failed to update element:', error);
            throw error;
        }
    }

    // Append API response to DOM element
    async appendToElement(selector, url, options = {}) {
        try {
            const response = await this.get(url, options);
            const element = document.querySelector(selector);

            if (element) {
                if (typeof response.data === 'string') {
                    element.innerHTML += response.data;
                } else {
                    element.innerHTML += JSON.stringify(response.data);
                }
            }

            return response;
        } catch (error) {
            console.error('Failed to append to element:', error);
            throw error;
        }
    }

    // Load template and render with API data
    async renderTemplate(selector, templateName, url, options = {}) {
        try {
            const response = await this.get(url, options);
            const view = new View();

            // Load template if not already loaded
            if (!view.templates[templateName]) {
                await view.loadTemplate(templateName, `resources/views/${templateName}.html`);
            }

            view.updateElement(selector, templateName, response.data);

            return response;
        } catch (error) {
            console.error('Failed to render template:', error);
            throw error;
        }
    }

    // Handle form submission
    async submitForm(formSelector, url, options = {}) {
        const form = document.querySelector(formSelector);
        if (!form) {
            throw new Error('Form not found');
        }

        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        return this.post(url, data, options);
    }

    // Upload file
    async uploadFile(fileSelector, url, options = {}) {
        const fileInput = document.querySelector(fileSelector);
        if (!fileInput || !fileInput.files[0]) {
            throw new Error('No file selected');
        }

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        const config = {
            ...options,
            headers: {
                ...options.headers
            }
        };

        // Remove Content-Type for file uploads
        delete config.headers['Content-Type'];

        return this.post(url, formData, config);
    }
} 