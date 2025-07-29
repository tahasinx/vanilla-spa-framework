class ApiController extends Controller {
    constructor() {
        super();
    }

    // Get all users (example)
    async getUsers() {
        return [
            { id: 1, name: 'John Doe', email: 'john@example.com' },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
        ];
    }

    // Example: Fetch from external API and return JSON
    async inspire() {
        try {
            const response = await fetch('https://dummyjson.com/products');
            const json = await response.json();
            return { products: json };
        } catch (error) {
            return { error: 'Failed to fetch external API' };
        }
    }
}

// Expose globally
window.ApiController = ApiController; 