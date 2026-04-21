class MetricsProvider extends ServiceProvider {
    register() {
        window.Container.singleton('metrics', () => ({
            track(eventName, payload = {}) {
                if (window.App && window.App.config && window.App.config.debug) {
                    console.log('[metrics]', eventName, payload);
                }
            }
        }));
    }

    boot() {
        const metrics = window.Container.make('metrics');
        metrics.track('provider.booted', { provider: 'MetricsProvider' });
    }
}

window.MetricsProvider = MetricsProvider;
