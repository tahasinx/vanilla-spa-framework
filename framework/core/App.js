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