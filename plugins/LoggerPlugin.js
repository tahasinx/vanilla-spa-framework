const LoggerPlugin = {
    install() {
        const originalRegisterComponent = App.registerComponent.bind(App);
        App.registerComponent = (name, component) => {
            if (window.App && window.App.config && window.App.config.debug) {
                console.log(`[plugin:logger] registerComponent -> ${name}`);
            }
            return originalRegisterComponent(name, component);
        };
    }
};

window.LoggerPlugin = LoggerPlugin;
