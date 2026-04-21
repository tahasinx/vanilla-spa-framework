class ServiceContainer {
    constructor() {
        this.bindings = new Map();
        this.singletons = new Map();
        this.instances = new Map();
    }

    bind(name, factory) {
        this.bindings.set(name, factory);
    }

    singleton(name, factory) {
        this.singletons.set(name, factory);
    }

    make(name) {
        if (this.instances.has(name)) {
            return this.instances.get(name);
        }

        if (this.singletons.has(name)) {
            const instance = this.singletons.get(name)(this);
            this.instances.set(name, instance);
            return instance;
        }

        if (this.bindings.has(name)) {
            return this.bindings.get(name)(this);
        }

        throw new Error(`Service "${name}" is not registered in container.`);
    }

    has(name) {
        return this.bindings.has(name) || this.singletons.has(name) || this.instances.has(name);
    }
}

window.ServiceContainer = ServiceContainer;
