class View {
    constructor() {
        this.templates = {};
        this.loadedTemplates = {};
    }

    // Register a template
    register(name, template) {
        this.templates[name] = template;
    }

    // Load template from file
    async loadTemplate(name, url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load template "${name}" from "${url}" (HTTP ${response.status})`);
            }
            const template = await response.text();
            this.templates[name] = template;
            return template;
        } catch (error) {
            console.error('Error loading template:', error);
            throw error;
        }
    }

    // Render a template with data
    render(templateName, data = {}) {
        let template = this.templates[templateName];

        if (!template) {
            console.error(`Template '${templateName}' not found`);
            return '';
        }

        // Blade-like: Handle @extends, @section, @yield, @include
        template = this.processIncludes(template, data);
        if (/@extends\(['"](.+?)['"]\)/.test(template)) {
            template = this.processExtends(template, data);
        }

        // 1. Process @for first!
        let rendered = this.processForLoops(template, data);

        // 2. Replace @if, @foreach, etc. first so loop-scoped variables remain available.
        rendered = this.processConditionals(rendered, data);
        rendered = this.processLoops(rendered, data);

        // 3. Raw output first (Laravel-style): {!! variable !!}
        rendered = rendered.replace(/\{!!\s*([^}]+)\s*!!\}/g, (match, variable) => {
            const value = this.resolveVariable(variable, data);
            return value !== undefined ? String(value) : '';
        });

        // 4. Escaped output (Laravel-style default): {{ variable }}
        rendered = rendered.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, variable) => {
            const value = this.resolveVariable(variable, data);
            return this.escapeHtml(value !== undefined ? String(value) : '');
        });

        return rendered;
    }

    resolveVariable(variable, data) {
        const keys = variable.trim().split('.');
        let value = data;
        for (let key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                value = '';
                break;
            }
        }
        return value;
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Render content with data
    renderContent(content, data) {
        // 1. Process @for first!
        let rendered = this.processForLoops(content, data);

        // 2. Replace @if, @foreach, etc. first so loop-scoped variables remain available.
        rendered = this.processConditionals(rendered, data);
        rendered = this.processLoops(rendered, data);

        // 3. Raw output first (Laravel-style): {!! variable !!}
        rendered = rendered.replace(/\{!!\s*([^}]+)\s*!!\}/g, (match, variable) => {
            const value = this.resolveVariable(variable, data);
            return value !== undefined ? String(value) : '';
        });

        // 4. Escaped output (Laravel-style default): {{ variable }}
        rendered = rendered.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, variable) => {
            const value = this.resolveVariable(variable, data);
            return this.escapeHtml(value !== undefined ? String(value) : '');
        });

        return rendered;
    }

    // Process conditional statements
    processConditionals(template, data) {
        // Handle @if statements
        template = template.replace(/@if\s*\(([^)]+)\)([\s\S]*?)(?:@else([\s\S]*?))?@endif/g, (match, condition, ifContent, elseContent) => {
            const result = this.evaluateCondition(condition, data);
            return result ? ifContent : (elseContent || '');
        });

        return template;
    }

    // Process foreach loops
    processLoops(template, data) {
        // Handle @foreach statements
        template = template.replace(/@foreach\s*\(([^)]+)\)([\s\S]*?)@endforeach/g, (match, loopExpr, loopContent) => {
            const [arrayName, itemName] = loopExpr.split(' as ').map(s => s.trim());
            const array = this.getNestedValue(arrayName, data);

            if (!Array.isArray(array)) {
                return '';
            }

            return array.map(item => {
                const loopData = { ...data, [itemName]: item };
                return this.renderContent(loopContent, loopData);
            }).join('');
        });

        return template;
    }

    // Evaluate a condition
    evaluateCondition(condition, data) {
        // Simple condition evaluation
        const parts = condition.split(' ');
        if (parts.length === 3) {
            const [left, operator, right] = parts;
            const leftValue = this.getNestedValue(left, data);
            const rightValue = this.getNestedValue(right, data);

            switch (operator) {
                case '==':
                    return leftValue == rightValue;
                case '===':
                    return leftValue === rightValue;
                case '!=':
                    return leftValue != rightValue;
                case '!==':
                    return leftValue !== rightValue;
                default:
                    return Boolean(leftValue);
            }
        }

        return Boolean(this.getNestedValue(condition, data));
    }

    // Get nested value from object
    getNestedValue(path, data) {
        const keys = path.split('.');
        let value = data;

        for (let key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }

        return value;
    }


    // Add support for @for(...) ... @endfor
    processForLoops(template, data) {
        // Match @for(expression) ... @endfor
        return template.replace(/@for\s*\(([^)]+)\)([\s\S]*?)@endfor/g, (match, expr, loopContent) => {
            const parsed = this.parseSimpleForExpression(expr, data);
            if (!parsed) {
                console.warn(`Skipping unsupported @for expression: ${expr}`);
                return '';
            }

            const { variableName, start, end, inclusive, step } = parsed;
            let output = '';

            if (step === 0) {
                return output;
            }

            for (
                let i = start;
                step > 0 ? (inclusive ? i <= end : i < end) : (inclusive ? i >= end : i > end);
                i += step
            ) {
                const loopData = { ...data, [variableName]: i };
                output += this.renderContent(loopContent, loopData);
            }

            return output;
        });
    }

    // Parse a constrained @for expression safely without eval/new Function.
    parseSimpleForExpression(expr, data) {
        const pattern = /^\s*(?:let|var|const)\s+([a-zA-Z_$][\w$]*)\s*=\s*([^;]+)\s*;\s*\1\s*(<=|<|>=|>)\s*([^;]+)\s*;\s*\1\s*(\+\+|--|\+=\s*-?\d+|-=\s*-?\d+)\s*$/;
        const match = expr.match(pattern);
        if (!match) {
            return null;
        }

        const variableName = match[1];
        const startRaw = match[2].trim();
        const operator = match[3];
        const endRaw = match[4].trim();
        const updateRaw = match[5].replace(/\s+/g, '');

        const start = this.resolveNumericValue(startRaw, data);
        const end = this.resolveNumericValue(endRaw, data);
        if (!Number.isFinite(start) || !Number.isFinite(end)) {
            return null;
        }

        let step = 0;
        if (updateRaw === '++') {
            step = 1;
        } else if (updateRaw === '--') {
            step = -1;
        } else if (updateRaw.startsWith('+=')) {
            step = Number(updateRaw.slice(2));
        } else if (updateRaw.startsWith('-=')) {
            step = -Number(updateRaw.slice(2));
        }

        if (!Number.isFinite(step) || step === 0) {
            return null;
        }

        const inclusive = operator === '<=' || operator === '>=';

        return {
            variableName,
            start,
            end,
            inclusive,
            step
        };
    }

    resolveNumericValue(raw, data) {
        const trimmed = raw.trim();

        if (/^-?\d+$/.test(trimmed)) {
            return Number(trimmed);
        }

        const nested = this.getNestedValue(trimmed, data);
        const numeric = Number(nested);
        return Number.isFinite(numeric) ? numeric : NaN;
    }

    // Blade-like: Process @extends and @section
    processExtends(template, data) {
        // Find @extends('layout')
        const extendsMatch = template.match(/@extends\(['"](.+?)['"]\)/);
        if (!extendsMatch) return template;
        const layoutName = extendsMatch[1];
        let layout = this.templates[layoutName];
        if (!layout) {
            console.error(`Layout template '${layoutName}' not found`);
            return template;
        }
        // Extract all @section('name') ... @endsection
        const sections = {};
        template.replace(/@section\(['"](.+?)['"]\)([\s\S]*?)@endsection/g, (match, name, content) => {
            sections[name] = content.trim();
            return '';
        });
        // Replace @yield('name') in layout with section content
        layout = layout.replace(/@yield\(['"](.+?)['"]\)/g, (match, name) => {
            return sections[name] || '';
        });
        return layout;
    }

    // Blade-like: Process @include('partial')
    processIncludes(template, data) {
        return template.replace(/@include\(['"](.+?)['"]\)/g, (match, partialName) => {
            const partial = this.templates[partialName];
            if (!partial) {
                console.error(`Included template '${partialName}' not found`);
                return '';
            }
            return partial;
        });
    }

    // Update DOM element with rendered content
    updateElement(selector, templateName, data = {}) {
        const element = document.querySelector(selector);
        if (element) {
            element.innerHTML = this.render(templateName, data);
        }
    }

    // Append content to DOM element
    appendToElement(selector, templateName, data = {}) {
        const element = document.querySelector(selector);
        if (element) {
            element.innerHTML += this.render(templateName, data);
        }
    }
} 