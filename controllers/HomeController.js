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

        if (!this.view.templates['home']) {
            await this.view.loadTemplate('home', 'resources/views/home.html');
        }
        this.view.updateElement('#app', 'home', data);
    }

    // About page
    async about() {
        const data = {
            title: 'About Us',
            content: 'This is a custom frontend framework inspired by Laravel but built with pure JavaScript.',
            team: [
                { name: 'Developer 1', role: 'Lead Developer' },
                { name: 'Developer 2', role: 'Frontend Developer' }
            ]
        };

        if (!this.view.templates['about']) {
            await this.view.loadTemplate('about', 'resources/views/about.html');
        }
        this.view.updateElement('#app', 'about', data);
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

    // Contact page
    async contact() {
        const data = {
            title: 'Contact Us',
            email: 'contact@example.com',
            phone: '+1 234 567 8900'
        };

        if (!this.view.templates['contact']) {
            await this.view.loadTemplate('contact', 'resources/views/contact.html');
        }
        this.view.updateElement('#app', 'contact', data);
    }

    // Blade page
    async blade() {
        // Preload all needed templates with correct keys
        await this.view.loadTemplate('layout', 'resources/views/master/layout.html');
        await this.view.loadTemplate('blade', 'resources/views/master/blade.html');
        await this.view.loadTemplate('alert', 'resources/views/master/alert.html');
        // Render with data for the partial
        this.view.updateElement('#app', 'blade', { message: 'This is an included alert!' });
    }
}

// Expose globally
window.HomeController = HomeController; 