class ServiceProvider {
    constructor(app) {
        this.app = app;
    }

    register() {
        // Override in providers
    }

    boot() {
        // Override in providers
    }
}

window.ServiceProvider = ServiceProvider;
