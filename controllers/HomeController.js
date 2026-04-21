class HomeController extends Controller {
    constructor() {
        super();
    }

    // Home page
    async index() {
        const data = {
            title: 'Build fast with Vanilla SPA Framework',
            description: 'A lightweight client-side framework with routing, templates, and API utilities in pure JavaScript.',
            features: [
                'Laravel-like routing',
                'Template system',
                'API integration',
                'Pure JavaScript',
                'No Node.js required'
            ]
        };

        if (!this.view.templates['welcome']) {
            await this.view.loadTemplate('welcome', 'resources/views/welcome.html');
        }
        this.view.updateElement('#app', 'welcome', data);
    }

    // Documentation page
    async docs() {
        const data = {
            title: 'Vanilla SPA Framework Documentation',
            subtitle: 'Practical examples for routing, templates, API calls, and event-driven UI behavior.'
        };

        if (!this.view.templates['docs']) {
            await this.view.loadTemplate('docs', 'resources/views/docs.html');
        }
        this.view.updateElement('#app', 'docs', data);
    }

}

// Expose globally
window.HomeController = HomeController; 