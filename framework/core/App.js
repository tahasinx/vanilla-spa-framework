class App {
    constructor() {
        // No need to create new instances, use global ones
    }

    static liveValidationTimers = {};
    static providers = [];
    static plugins = [];

    // Initialize the application
    static init() {
        window.App = new App();
        window.View = window.View || new View();
        window.Api = window.Api || new Api();
        window.Container = window.Container || new ServiceContainer();
        window.AppStore = window.AppStore || new Store({});

        App.registerCoreServices();
        App.bootProviders();
        App.installPlugins();

        // Initialize router
        window.AppRouter.init();

        // Set up global error handling
        App.setupErrorHandling();

        // Set up global event listeners
        App.setupEventListeners();

        console.log('Custom Framework initialized');
    }

    static registerCoreServices() {
        if (!window.Container || typeof window.Container.singleton !== 'function') {
            return;
        }

        if (!window.Container.has('router')) {
            window.Container.singleton('router', () => window.AppRouter);
        }
        if (!window.Container.has('api')) {
            window.Container.singleton('api', () => window.Api);
        }
        if (!window.Container.has('view')) {
            window.Container.singleton('view', () => window.View);
        }
        if (!window.Container.has('validator')) {
            window.Container.singleton('validator', () => window.Validator);
        }
        if (!window.Container.has('auth')) {
            window.Container.singleton('auth', () => window.Auth);
        }
        if (!window.Container.has('store')) {
            window.Container.singleton('store', () => window.AppStore);
        }
    }

    static registerProvider(ProviderClass) {
        App.providers.push(ProviderClass);
    }

    static bootProviders() {
        App.providers.forEach((ProviderClass) => {
            try {
                const provider = new ProviderClass(window.App);
                if (typeof provider.register === 'function') {
                    provider.register();
                }
                if (typeof provider.boot === 'function') {
                    provider.boot();
                }
            } catch (error) {
                console.error('Provider boot failed:', error);
            }
        });
    }

    static use(plugin) {
        App.plugins.push(plugin);
    }

    static installPlugins() {
        App.plugins.forEach((plugin) => {
            try {
                if (plugin && typeof plugin.install === 'function') {
                    plugin.install(window.App);
                } else if (typeof plugin === 'function') {
                    plugin(window.App);
                }
            } catch (error) {
                console.error('Plugin install failed:', error);
            }
        });
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

        // Live validation for forms that opt in with data-validate-live="true"
        document.addEventListener('input', (event) => {
            const field = event.target;
            if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) {
                return;
            }

            const form = field.closest('form[data-validate-live="true"]');
            if (!form || (!form.getAttribute('data-validate') && !form.getAttribute('data-request'))) {
                return;
            }

            const debounceMs = Number(form.getAttribute('data-validate-debounce') || 250);
            const timerKey = `${form.getAttribute('id') || 'form'}::${field.name}`;
            if (App.liveValidationTimers[timerKey]) {
                clearTimeout(App.liveValidationTimers[timerKey]);
            }
            App.liveValidationTimers[timerKey] = setTimeout(() => {
                App.validateFieldLive(form, field);
                delete App.liveValidationTimers[timerKey];
            }, Number.isFinite(debounceMs) ? debounceMs : 250);
        });

        // Handle link clicks
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a');
            if (link && link.getAttribute('data-route')) {
                if (link.getAttribute('target') === '_blank') {
                    return;
                }
                event.preventDefault();
                const route = link.getAttribute('data-route');
                window.AppRouter.navigate(route);

                // Close mobile demo menu after selecting a route
                const isDemoMenuLink = link.closest('.ms-demo .main-menu');
                if (isDemoMenuLink) {
                    const mainMenu = document.querySelector('.ms-demo .main-menu');
                    if (mainMenu) {
                        mainMenu.classList.remove('show');
                    }
                }
            }
        });

        // Prefetch route templates on intent (hover/focus), similar to modern SPA link prefetch.
        const prefetchRouteFromLink = (event) => {
            const link = event.target.closest('a[data-route]');
            if (!link || !window.AppRouter || typeof window.AppRouter.findRoute !== 'function') {
                return;
            }
            const routePath = link.getAttribute('data-route');
            const route = window.AppRouter.findRoute(routePath, 'GET');
            if (route && typeof window.AppRouter.prefetchRouteAssets === 'function') {
                window.AppRouter.prefetchRouteAssets(route);
            }
        };
        document.addEventListener('mouseover', prefetchRouteFromLink);
        document.addEventListener('focusin', prefetchRouteFromLink);

        // Handle demo mobile menu toggle
        document.addEventListener('click', (event) => {
            const menuBtn = event.target.closest('.ms-demo .menu-btn');
            const mainMenu = document.querySelector('.ms-demo .main-menu');
            if (!mainMenu) {
                return;
            }

            if (menuBtn) {
                mainMenu.classList.toggle('show');
                return;
            }

            // Close menu when clicking outside on mobile
            const clickedInsideMenu = event.target.closest('.ms-demo .main-menu');
            if (!clickedInsideMenu) {
                mainMenu.classList.remove('show');
            }
        });

        // Keep demo menu active state synced with current route
        const normalizePath = (path) => {
            if (!path) return '/';
            if (path.length > 1 && path.endsWith('/')) {
                return path.slice(0, -1);
            }
            return path;
        };

        const syncDemoMenuActiveState = () => {
            if (!window.AppRouter || typeof window.AppRouter.getCurrentPath !== 'function') {
                return;
            }

            const currentPath = normalizePath(window.AppRouter.getCurrentPath());
            const demoMenuLinks = document.querySelectorAll('.ms-demo .main-menu a[data-route]');

            demoMenuLinks.forEach((menuLink) => {
                const route = normalizePath(menuLink.getAttribute('data-route'));
                const isExactMatch = route === currentPath;
                const isNestedMatch = route !== '/demo' && currentPath.startsWith(`${route}/`);
                menuLink.classList.toggle('is-active', isExactMatch || isNestedMatch);
            });
        };

        const scheduleDemoMenuSync = () => {
            // Route rendering is async; run after current paint cycle.
            requestAnimationFrame(() => {
                requestAnimationFrame(syncDemoMenuActiveState);
            });
        };

        window.addEventListener('hashchange', scheduleDemoMenuSync);
        scheduleDemoMenuSync();
        App.scheduleCodeHighlight();

        // Docs page sidebar interactions: drawer + scroll spy
        document.addEventListener('click', (event) => {
            const docsToggle = event.target.closest('.docs-drawer-toggle');
            const docsSidebar = document.querySelector('.docs-sidebar');

            if (docsToggle && docsSidebar) {
                docsSidebar.classList.toggle('is-open');
                return;
            }

            const docsNavLink = event.target.closest('.docs-sidebar a[data-docs-target]');
            if (docsNavLink) {
                const targetId = docsNavLink.getAttribute('data-docs-target');
                const section = document.getElementById(targetId);
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                if (docsSidebar) {
                    docsSidebar.classList.remove('is-open');
                }
                return;
            }

            if (docsSidebar && docsSidebar.classList.contains('is-open')) {
                const clickedInsideSidebar = event.target.closest('.docs-sidebar');
                if (!clickedInsideSidebar) {
                    docsSidebar.classList.remove('is-open');
                }
            }
        });

        const syncDocsSidebarActiveState = () => {
            const docsLinks = document.querySelectorAll('.docs-sidebar a[data-docs-target]');
            if (!docsLinks.length) {
                return;
            }

            const sections = Array.from(docsLinks)
                .map((link) => document.getElementById(link.getAttribute('data-docs-target')))
                .filter(Boolean);

            if (!sections.length) {
                return;
            }

            let activeSectionId = sections[0].id;
            const marker = window.scrollY + 140;
            for (const section of sections) {
                if (section.offsetTop <= marker) {
                    activeSectionId = section.id;
                }
            }

            docsLinks.forEach((link) => {
                const targetId = link.getAttribute('data-docs-target');
                link.classList.toggle('is-active', targetId === activeSectionId);
            });
        };

        window.addEventListener('scroll', syncDocsSidebarActiveState, { passive: true });
        window.addEventListener('resize', syncDocsSidebarActiveState);
        requestAnimationFrame(syncDocsSidebarActiveState);
        window.addEventListener('hashchange', () => App.scheduleCodeHighlight());

        // Handle API update triggers
        document.addEventListener('click', (event) => {
            const element = event.target.closest('[data-api-url]');
            if (!element) {
                return;
            }

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

            const validationConfig = App.resolveValidationConfig(form);
            if (validationConfig && window.Validator) {
                const { rules: validationRules, messages: validationMessages } = validationConfig;
                const validation = window.Validator.validate(data, validationRules, validationMessages);

                if (validation.fails) {
                    const targetSelector = form.getAttribute('data-target');
                    App.renderValidationErrors(targetSelector, validation.errors);
                    App.renderFieldValidationErrors(form, validation.errors);
                    form.dispatchEvent(new CustomEvent('form-error', {
                        detail: {
                            type: 'validation',
                            errors: validation.errors
                        }
                    }));
                    return;
                }
            }

            App.clearFieldValidationErrors(form);

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
                    const allowHtml = form.getAttribute('data-response-format') === 'html';
                    App.renderResponseContent(element, response.data, allowHtml);
                }
            }

            // Trigger success event
            form.dispatchEvent(new CustomEvent('form-success', { detail: response }));

        } catch (error) {
            console.error('Form submission failed:', error);
            form.dispatchEvent(new CustomEvent('form-error', { detail: error }));
        }
    }

    static parseJsonAttribute(rawValue, fallback = {}) {
        try {
            return JSON.parse(rawValue);
        } catch (error) {
            console.warn('Invalid JSON in data attribute:', rawValue);
            return fallback;
        }
    }

    static escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    static renderResponseContent(element, responseData, allowHtml = false) {
        if (typeof responseData === 'string') {
            if (allowHtml) {
                element.innerHTML = responseData;
                return;
            }
            element.textContent = responseData;
            return;
        }

        element.innerHTML = '';
        const pre = document.createElement('pre');
        pre.className = 'api-pretty-json';
        pre.textContent = JSON.stringify(responseData, null, 2);
        element.appendChild(pre);
    }

    static renderValidationErrors(targetSelector, errors = {}) {
        if (!targetSelector) {
            return;
        }
        const element = document.querySelector(targetSelector);
        if (!element) {
            return;
        }

        const fields = Object.keys(errors);
        if (!fields.length) {
            element.innerHTML = '';
            return;
        }

        const items = fields
            .flatMap((field) => (errors[field] || []).map((msg) => {
                const safeField = App.escapeHtml(field);
                const safeMessage = App.escapeHtml(msg);
                return `<li><span class="field">${safeField}</span><span class="msg">${safeMessage}</span></li>`;
            }))
            .join('');

        element.innerHTML = `<ul class="validation-errors">${items}</ul>`;
    }

    static scheduleCodeHighlight() {
        // Route rendering is async; run after paint cycles.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => App.highlightCodeBlocks());
        });
    }

    static highlightCodeBlocks() {
        if (!window.hljs) {
            return;
        }

        const blocks = document.querySelectorAll('pre.docs-code');
        blocks.forEach((pre) => {
            let code = pre.querySelector('code');
            if (!code) {
                code = document.createElement('code');
                code.textContent = pre.textContent;
                pre.textContent = '';
                pre.appendChild(code);
            }
            window.hljs.highlightElement(code);
        });
    }

    static validateFieldLive(form, field) {
        if (!window.Validator) {
            return;
        }

        const validationConfig = App.resolveValidationConfig(form);
        if (!validationConfig) {
            return;
        }
        const { rules, messages } = validationConfig;
        const fieldRules = rules[field.name];

        if (!fieldRules) {
            field.classList.remove('is-valid', 'is-invalid');
            return;
        }

        const payload = { [field.name]: field.value };
        const validation = window.Validator.validate(payload, { [field.name]: fieldRules }, messages);
        const fieldErrors = validation.errors[field.name] || [];

        if (fieldErrors.length) {
            field.classList.add('is-invalid');
            field.classList.remove('is-valid');
            field.setAttribute('aria-invalid', 'true');
            App.setFieldErrorMessage(field, fieldErrors[0]);
        } else {
            field.classList.remove('is-invalid');
            field.classList.add('is-valid');
            field.setAttribute('aria-invalid', 'false');
            App.setFieldErrorMessage(field, '');
        }

        // Keep target panel synced with current invalid fields during live validation.
        const allFieldErrors = {};
        const inputs = form.querySelectorAll('input[name], textarea[name], select[name]');
        inputs.forEach((input) => {
            const name = input.getAttribute('name');
            if (!name || !rules[name]) {
                return;
            }
            const result = window.Validator.validate({ [name]: input.value }, { [name]: rules[name] }, messages);
            if (result.errors[name] && result.errors[name].length) {
                allFieldErrors[name] = result.errors[name];
            }
        });

        const targetSelector = form.getAttribute('data-target');
        App.renderValidationErrors(targetSelector, allFieldErrors);
        App.renderFieldValidationErrors(form, allFieldErrors);
    }

    static resolveValidationConfig(form) {
        const requestClassName = form.getAttribute('data-request');
        if (requestClassName && typeof window[requestClassName] === 'function') {
            try {
                const request = new window[requestClassName]();
                const rules = typeof request.rules === 'function' ? request.rules() : {};
                const messages = typeof request.messages === 'function' ? request.messages() : {};
                return { rules, messages };
            } catch (error) {
                console.error(`Failed to instantiate request class "${requestClassName}"`, error);
            }
        }

        const validationRulesRaw = form.getAttribute('data-validate');
        if (!validationRulesRaw) {
            return null;
        }

        const validationMessagesRaw = form.getAttribute('data-validate-messages') || '{}';
        return {
            rules: App.parseJsonAttribute(validationRulesRaw, {}),
            messages: App.parseJsonAttribute(validationMessagesRaw, {})
        };
    }

    static renderFieldValidationErrors(form, errors = {}) {
        const inputs = form.querySelectorAll('input[name], textarea[name], select[name]');
        inputs.forEach((input) => {
            const name = input.getAttribute('name');
            const fieldErrors = (name && errors[name]) ? errors[name] : [];

            if (fieldErrors.length) {
                input.classList.add('is-invalid');
                input.classList.remove('is-valid');
                input.setAttribute('aria-invalid', 'true');
                App.setFieldErrorMessage(input, fieldErrors[0]);
            } else {
                if (!input.classList.contains('is-valid')) {
                    input.classList.remove('is-invalid');
                }
                input.setAttribute('aria-invalid', 'false');
                App.setFieldErrorMessage(input, '');
            }
        });
    }

    static clearFieldValidationErrors(form) {
        const inputs = form.querySelectorAll('input[name], textarea[name], select[name]');
        inputs.forEach((input) => {
            input.classList.remove('is-invalid');
            input.setAttribute('aria-invalid', 'false');
            App.setFieldErrorMessage(input, '');
        });
    }

    static setFieldErrorMessage(input, message) {
        const name = input.getAttribute('name');
        if (!name) {
            return;
        }

        let holder = input.parentElement ? input.parentElement.querySelector(`[data-field-error="${name}"]`) : null;
        if (!holder) {
            holder = document.createElement('small');
            holder.setAttribute('data-field-error', name);
            holder.className = 'field-error-message';
            if (input.id) {
                holder.id = `${input.id}-error`;
            }
            if (input.parentElement) {
                input.parentElement.appendChild(holder);
            }
        }

        holder.textContent = message || '';
        holder.style.display = message ? 'block' : 'none';
        if (holder.id) {
            input.setAttribute('aria-describedby', holder.id);
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