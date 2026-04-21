class Store {
    constructor(initialState = {}) {
        this.state = { ...initialState };
        this.listeners = new Set();
    }

    getState() {
        return { ...this.state };
    }

    setState(patch = {}) {
        this.state = { ...this.state, ...patch };
        this.notify();
    }

    update(updater) {
        const nextState = updater({ ...this.state });
        if (nextState && typeof nextState === 'object') {
            this.state = nextState;
            this.notify();
        }
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify() {
        const snapshot = this.getState();
        this.listeners.forEach((listener) => listener(snapshot));
    }
}

window.Store = Store;
