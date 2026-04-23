class Api {
    constructor() {
        this.baseUrl = '';
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        this.liveJobs = new Map();
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
        const localRoute = window.AppRouter.hasRoute(url, method);
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
        const { data, ...requestOptions } = options;
        const config = {
            method: method,
            headers: { ...this.defaultHeaders, ...(requestOptions.headers || {}) },
            ...requestOptions
        };

        // Add body for requests that need it
        if (['POST', 'PUT', 'PATCH'].includes(method) && data !== undefined) {
            if (data instanceof FormData) {
                config.body = data;
                // Browser must set multipart boundary automatically.
                delete config.headers['Content-Type'];
            } else {
                config.body = JSON.stringify(data);
            }
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
                const allowHtml = options.responseType === 'html' || response.type === 'html';
                if (window.App && typeof window.App.constructor.renderResponseContent === 'function') {
                    window.App.constructor.renderResponseContent(element, response.data, allowHtml);
                } else if (allowHtml && typeof response.data === 'string') {
                    element.innerHTML = response.data;
                } else if (typeof response.data === 'string') {
                    element.textContent = response.data;
                } else {
                    element.innerHTML = `<pre class="api-pretty-json">${JSON.stringify(response.data, null, 2)}</pre>`;
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
                const allowHtml = options.responseType === 'html' || response.type === 'html';
                if (allowHtml && typeof response.data === 'string') {
                    element.insertAdjacentHTML('beforeend', response.data);
                } else if (typeof response.data === 'string') {
                    element.append(document.createTextNode(response.data));
                } else {
                    element.innerHTML += `<pre class="api-pretty-json">${JSON.stringify(response.data, null, 2)}</pre>`;
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

    renderLiveResponse(targetSelectorOrElement, response, options = {}) {
        const target = (typeof targetSelectorOrElement === 'string')
            ? document.querySelector(targetSelectorOrElement)
            : targetSelectorOrElement;
        if (!target) {
            return;
        }

        const allowHtml = options.responseType === 'html' || response.type === 'html';
        if (window.App && typeof window.App.constructor.renderResponseContent === 'function') {
            window.App.constructor.renderResponseContent(target, response.data, allowHtml);
            return;
        }

        if (allowHtml && typeof response.data === 'string') {
            target.innerHTML = response.data;
            return;
        }

        if (typeof response.data === 'string') {
            target.textContent = response.data;
            return;
        }

        target.innerHTML = `<pre class="api-pretty-json">${JSON.stringify(response.data, null, 2)}</pre>`;
    }

    normalizeLiveId(config = {}) {
        if (config.id) {
            return String(config.id);
        }
        const url = String(config.url || '');
        const target = String(config.target || '');
        return `live:${url}:${target}`;
    }

    getLiveSnapshotSignature(response) {
        if (!response) {
            return '';
        }
        const payload = {
            status: response.status,
            type: response.type || null,
            data: response.data
        };
        try {
            return JSON.stringify(payload);
        } catch (error) {
            return String(payload.data);
        }
    }

    live(config = {}) {
        const {
            url,
            target = null,
            interval = 5000,
            immediate = true,
            dedupe = true,
            backoff = true,
            maxInterval = 60000,
            responseType = 'json'
        } = config;

        if (!url) {
            throw new Error('Api.live requires a url.');
        }

        const id = this.normalizeLiveId(config);
        const existing = this.liveJobs.get(id);
        if (existing) {
            return existing.publicApi;
        }

        const baseInterval = Math.max(250, Number(interval) || 5000);
        const maxIntervalValue = Math.max(baseInterval, Number(maxInterval) || 60000);

        const state = {
            id,
            url,
            target,
            baseInterval,
            currentInterval: baseInterval,
            maxInterval: maxIntervalValue,
            dedupe: Boolean(dedupe),
            backoff: Boolean(backoff),
            responseType,
            inFlight: false,
            running: false,
            timer: null,
            failCount: 0,
            lastSignature: null
        };

        const scheduleNext = () => {
            if (!state.running) {
                return;
            }
            clearTimeout(state.timer);
            state.timer = setTimeout(() => tick(), state.currentInterval);
        };

        const tick = async () => {
            if (!state.running || state.inFlight) {
                return;
            }
            state.inFlight = true;
            try {
                const response = await this.get(state.url);
                const signature = this.getLiveSnapshotSignature(response);
                const changed = !state.dedupe || signature !== state.lastSignature;
                if (changed) {
                    this.renderLiveResponse(state.target, response, { responseType: state.responseType });
                    state.lastSignature = signature;
                }
                state.failCount = 0;
                state.currentInterval = state.baseInterval;
            } catch (error) {
                state.failCount += 1;
                if (state.backoff) {
                    const factor = Math.min(6, state.failCount);
                    state.currentInterval = Math.min(state.maxInterval, state.baseInterval * (2 ** factor));
                }
                console.warn(`Live polling failed (${state.id})`, error);
            } finally {
                state.inFlight = false;
                scheduleNext();
            }
        };

        const start = () => {
            if (state.running) {
                return;
            }
            state.running = true;
            if (immediate) {
                tick();
                return;
            }
            scheduleNext();
        };

        const stop = () => {
            state.running = false;
            clearTimeout(state.timer);
            state.timer = null;
            this.liveJobs.delete(id);
        };

        const publicApi = {
            id,
            start,
            stop,
            isRunning: () => state.running
        };

        state.publicApi = publicApi;
        this.liveJobs.set(id, state);
        start();
        return publicApi;
    }

    stopLive(id) {
        const key = String(id || '');
        if (!key) {
            return;
        }
        const job = this.liveJobs.get(key);
        if (job && job.publicApi) {
            job.publicApi.stop();
        }
    }

    stopLiveByPrefix(prefix = '') {
        const text = String(prefix || '');
        if (!text) {
            return;
        }
        Array.from(this.liveJobs.keys())
            .filter((key) => key.startsWith(text))
            .forEach((key) => this.stopLive(key));
    }

    stopAllLive() {
        Array.from(this.liveJobs.keys()).forEach((key) => this.stopLive(key));
    }
} 