class TestRunner {
    constructor() {
        this.passed = 0;
        this.failed = 0;
        this.results = [];
    }

    test(name, fn) {
        try {
            fn();
            this.passed += 1;
            this.results.push({ name, status: 'passed' });
        } catch (error) {
            this.failed += 1;
            this.results.push({ name, status: 'failed', error: error.message });
        }
    }

    assert(condition, message = 'Assertion failed') {
        if (!condition) {
            throw new Error(message);
        }
    }

    report(targetSelector = '#test-results') {
        const target = document.querySelector(targetSelector);
        if (!target) return;

        const rows = this.results.map((result) => {
            if (result.status === 'passed') {
                return `<li class="passed">PASS - ${result.name}</li>`;
            }
            return `<li class="failed">FAIL - ${result.name} - ${result.error}</li>`;
        }).join('');

        target.innerHTML = `
            <h2>Test Report</h2>
            <p>Passed: ${this.passed} | Failed: ${this.failed}</p>
            <ul>${rows}</ul>
        `;
    }
}

window.TestRunner = TestRunner;
