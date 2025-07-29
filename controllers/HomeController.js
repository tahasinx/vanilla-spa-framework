class HomeController extends Controller {
    constructor() {
        super();
    }

    // Home page
    async index() {
        const data = {
            title: 'Welcome to Custom Framework',
            description: 'A Laravel-like frontend framework built with pure JavaScript',
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
}

// Expose globally
window.HomeController = HomeController; 