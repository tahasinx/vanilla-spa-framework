class DemoController extends Controller {
    constructor() {
        super();
    }

    getBlogPosts() {
        return [
            {
                id: 1,
                title: 'How hash routing works',
                date: 'Apr 12, 2026',
                category: 'Routing',
                readTime: '6 min',
                summary: 'Understand how URL hashes map to routes and controllers in this framework.',
                keyPoints: [
                    'Hash path is the source of truth for client navigation.',
                    'Routes are declared in one file for consistency.',
                    'Controller actions receive route params for dynamic pages.'
                ]
            },
            {
                id: 2,
                title: 'Blade-like templates in plain JS',
                date: 'Apr 15, 2026',
                category: 'Templating',
                readTime: '7 min',
                summary: 'Use familiar directive syntax for clean view logic without heavy tooling.',
                keyPoints: [
                    'Use @extends/@section/@yield for layout reuse.',
                    'Use @foreach for data-driven cards and tables.',
                    'Keep templates simple and pass data from controllers.'
                ]
            },
            {
                id: 3,
                title: 'Building API-driven UI quickly',
                date: 'Apr 18, 2026',
                category: 'API',
                readTime: '5 min',
                summary: 'Wire API responses directly into your UI with simple data attributes.',
                keyPoints: [
                    'Use data-api-url and data-target for quick updates.',
                    'Use ApiController for local JSON endpoints.',
                    'Keep UI feedback clear for loading and error states.'
                ]
            },
            {
                id: 4,
                title: 'Designing elegant forms for business apps',
                date: 'Apr 20, 2026',
                category: 'UX',
                readTime: '8 min',
                summary: 'Build slim, professional forms with clear labels and strong hierarchy.',
                keyPoints: [
                    'Use concise labels and practical placeholders.',
                    'Keep field spacing compact and consistent.',
                    'Post to API routes and render response in target blocks.'
                ]
            }
        ];
    }

    async index() {
        const data = {
            siteName: 'Acme Studio',
            pageTitle: 'Home',
            pageHeading: 'Surface Deals',
            pageDescription: 'Select Surfaces are on sale now - save while supplies last'
        };

        if (!this.view.templates['demo.layout']) {
            await this.view.loadTemplate('demo.layout', 'resources/views/demo/master/layout.html');
        }
        if (!this.view.templates['demo_home']) {
            await this.view.loadTemplate('demo_home', 'resources/views/demo/home.html');
        }
        this.view.updateElement('#app', 'demo_home', data);
    }

    async about() {
        const data = {
            siteName: 'Acme Studio',
            pageTitle: 'About',
            pageHeading: 'About Acme Studio',
            description: 'We are a small digital team focused on shipping simple and maintainable web products.',
            values: [
                'Keep architecture understandable',
                'Build features with practical examples',
                'Use lightweight tooling when possible'
            ],
            teamMembers: [
                { name: 'Nadia Hassan', role: 'Product Lead', experience: '8 years' },
                { name: 'Arman Lee', role: 'Frontend Engineer', experience: '6 years' },
                { name: 'Riya Patel', role: 'UI Designer', experience: '5 years' }
            ],
            milestones: [
                { quarter: 'Q1 2026', target: 'Design system rollout', status: 'Completed' },
                { quarter: 'Q2 2026', target: 'Client portal launch', status: 'In Progress' },
                { quarter: 'Q3 2026', target: 'Analytics dashboard', status: 'Planned' }
            ]
        };

        if (!this.view.templates['demo.layout']) {
            await this.view.loadTemplate('demo.layout', 'resources/views/demo/master/layout.html');
        }
        if (!this.view.templates['demo_about']) {
            await this.view.loadTemplate('demo_about', 'resources/views/demo/about.html');
        }
        this.view.updateElement('#app', 'demo_about', data);
    }

    async services() {
        const data = {
            siteName: 'Acme Studio',
            pageTitle: 'Services',
            pageHeading: 'Our Services',
            serviceRows: [
                { service: 'Web Design', timeline: '1-2 weeks', owner: 'Design Team' },
                { service: 'Frontend Development', timeline: '2-4 weeks', owner: 'Engineering Team' },
                { service: 'API Integration', timeline: '1-3 weeks', owner: 'Platform Team' },
                { service: 'Performance Optimization', timeline: '1 week', owner: 'QA Team' }
            ],
            plans: [
                { name: 'Starter', price: '$299', pages: '1-2 pages', support: 'Email' },
                { name: 'Growth', price: '$899', pages: 'Up to 8 pages', support: 'Priority email' },
                { name: 'Pro', price: '$1499', pages: 'Unlimited pages', support: 'Dedicated channel' }
            ],
            deliverables: [
                'Wireframes and UI kit',
                'Production-ready responsive pages',
                'Integrated forms and API endpoints',
                'Handover notes and maintenance guide'
            ]
        };

        if (!this.view.templates['demo.layout']) {
            await this.view.loadTemplate('demo.layout', 'resources/views/demo/master/layout.html');
        }
        if (!this.view.templates['demo_services']) {
            await this.view.loadTemplate('demo_services', 'resources/views/demo/services.html');
        }
        this.view.updateElement('#app', 'demo_services', data);
    }

    async blog() {
        const posts = this.getBlogPosts();
        const data = {
            siteName: 'Acme Studio',
            pageTitle: 'Blog',
            pageHeading: 'Latest Insights',
            posts: posts,
            performance: [
                { month: 'Jan', visitors: '12,400', conversions: '3.1%' },
                { month: 'Feb', visitors: '14,100', conversions: '3.4%' },
                { month: 'Mar', visitors: '15,750', conversions: '3.8%' }
            ]
        };

        if (!this.view.templates['demo.layout']) {
            await this.view.loadTemplate('demo.layout', 'resources/views/demo/master/layout.html');
        }
        if (!this.view.templates['demo_blog']) {
            await this.view.loadTemplate('demo_blog', 'resources/views/demo/blog.html');
        }
        this.view.updateElement('#app', 'demo_blog', data);
    }

    async blogView(params = {}) {
        const posts = this.getBlogPosts();
        const targetId = Number(params.id);
        const post = posts.find((item) => item.id === targetId) || posts[0];

        const data = {
            siteName: 'Acme Studio',
            pageTitle: 'Blog View',
            pageHeading: post.title,
            post: post
        };

        if (!this.view.templates['demo.layout']) {
            await this.view.loadTemplate('demo.layout', 'resources/views/demo/master/layout.html');
        }
        if (!this.view.templates['demo_blog_view']) {
            await this.view.loadTemplate('demo_blog_view', 'resources/views/demo/blog-view.html');
        }
        this.view.updateElement('#app', 'demo_blog_view', data);
    }

    async contact() {
        const data = {
            siteName: 'Acme Studio',
            pageTitle: 'Contact',
            pageHeading: 'Contact Us',
            email: 'hello@acmestudio.dev',
            phone: '+1 234 567 8900',
            offices: [
                { location: 'New York', hours: '09:00 - 18:00', timezone: 'EST' },
                { location: 'Dubai', hours: '10:00 - 19:00', timezone: 'GST' },
                { location: 'Bangalore', hours: '09:30 - 18:30', timezone: 'IST' }
            ],
            inquiryTypes: [
                'New project inquiry',
                'Technical consultation',
                'Support and maintenance',
                'Partnership request'
            ]
        };

        if (!this.view.templates['demo.layout']) {
            await this.view.loadTemplate('demo.layout', 'resources/views/demo/master/layout.html');
        }
        if (!this.view.templates['demo_contact']) {
            await this.view.loadTemplate('demo_contact', 'resources/views/demo/contact.html');
        }
        this.view.updateElement('#app', 'demo_contact', data);
    }
}

window.DemoController = DemoController;
