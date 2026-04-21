document.addEventListener('DOMContentLoaded', () => {
    const runner = new TestRunner();

    runner.test('Validator required rule', () => {
        const result = window.Validator.validate({ name: '' }, { name: 'required' });
        runner.assert(result.fails, 'Expected required rule to fail');
    });

    runner.test('Validator email rule', () => {
        const result = window.Validator.validate({ email: 'dev@example.com' }, { email: 'required|email' });
        runner.assert(result.passes, 'Expected email rule to pass');
    });

    runner.test('Router named route build', () => {
        const path = window.route('demo.blog.view', { id: 3 });
        runner.assert(path === '/demo/blog/3', `Expected /demo/blog/3 got ${path}`);
    });

    runner.test('Store state updates', () => {
        const store = new Store({ count: 1 });
        store.setState({ count: 2 });
        const state = store.getState();
        runner.assert(state.count === 2, 'Expected store count to update');
    });

    runner.test('Container singleton returns same instance', () => {
        const container = new ServiceContainer();
        container.singleton('demo', () => ({ name: 'service' }));
        const first = container.make('demo');
        const second = container.make('demo');
        runner.assert(first === second, 'Expected singleton instances to match');
    });

    runner.report();
});
