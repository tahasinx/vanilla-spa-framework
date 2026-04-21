class ApiController extends Controller {
    constructor() {
        super();
    }

    // Get all users (example)
    async getUsers() {
        return response().json([
            { id: 1, name: 'John Doe', email: 'john@example.com' },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
        ]);
    }

    // Example: Fetch from external API and return JSON
    async inspire() {
        try {
            const response = await fetch('https://dummyjson.com/products');
            const json = await response.json();
            return window.response().json({ products: json }, 200);
        } catch (error) {
            return window.response().error('Failed to fetch external API', 502);
        }
    }

    // Demo stats for practical API integration examples
    async getDemoStats() {
        return this.apiResponse({
            visitorsToday: 1284,
            conversionRate: '4.9%',
            openTickets: 7,
            topPage: '/demo/services'
        }, 200);
    }

    // Demo contact endpoint for form handling examples
    async submitDemoContact(data = {}) {
        return this.apiResponse({
            success: true,
            message: `Thanks ${data.name || 'there'}, your message was received.`,
            payload: data
        }, 200);
    }
}

// Expose globally
window.ApiController = ApiController; 