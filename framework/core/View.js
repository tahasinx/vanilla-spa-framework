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
            const template = await response.text();
            this.templates[name] = template;
            return template;
        } catch (error) {
            console.error('Error loading template:', error);
            return '';
        }
    }

    // Render a template with data
    render(templateName, data = {}) {
        let template = this.templates[templateName];

        if (!template) {
            console.error(`Template '${templateName}' not found`);
            return '';
        }

        // 1. Process @for first!
        let rendered = this.processForLoops(template, data);

        // 2. Only replace {{ ... }} outside of for-loops
        // Split by for-loop blocks and process separately
        rendered = rendered.replace(/@for\s*\(([^)]+)\)([\s\S]*?)@endfor/g, (match) => {
            // Don't process {{ ... }} inside for-loops
            return match;
        });
        // Now process {{ ... }} in the rest
        rendered = rendered.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, variable) => {
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
            return value !== undefined ? value : '';
        });

        // 3. Replace @if, @foreach, etc.
        rendered = this.processConditionals(rendered, data);
        rendered = this.processLoops(rendered, data);

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

    // Render content with data
    renderContent(content, data) {
        // 1. Process @for first!
        let rendered = this.processForLoops(content, data);

        // 2. Only replace {{ ... }} outside of for-loops
        rendered = rendered.replace(/@for\s*\(([^)]+)\)([\s\S]*?)@endfor/g, (match) => {
            return match;
        });
        rendered = rendered.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, variable) => {
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
            return value !== undefined ? value : '';
        });

        // 3. Replace @if, @foreach, etc.
        rendered = this.processConditionals(rendered, data);
        rendered = this.processLoops(rendered, data);

        return rendered;
    }

    // Add support for @for(...) ... @endfor
    processForLoops(template, data) {
        // Match @for(expression) ... @endfor
        return template.replace(/@for\s*\(([^)]+)\)([\s\S]*?)@endfor/g, (match, expr, loopContent) => {
            let output = '';
            try {
                // Find all variable declarations in the for expression
                const varNames = [];
                const varRegex = /(?:var|let|const)\s+([a-zA-Z_$][\w$]*)/g;
                let m;
                while ((m = varRegex.exec(expr)) !== null) {
                    varNames.push(m[1]);
                }
                let processedContent = loopContent;
                // Replace {{ var }} with ${var} for all declared variables
                for (const varName of varNames) {
                    processedContent = processedContent.replace(new RegExp(`\{\{\s*${varName}\s*\}\}`, 'g'), '${' + varName + '}');
                }
                // Also replace {{ key }} with ${key} for all data keys
                for (const key of Object.keys(data)) {
                    processedContent = processedContent.replace(new RegExp(`\{\{\s*${key}\s*\}\}`, 'g'), '${' + key + '}');
                }
                // Build variable declarations for all data keys
                let dataVars = '';
                for (const key of Object.keys(data)) {
                    if (/^[a-zA-Z_$][\w$]*$/.test(key)) {
                        dataVars += `var ${key} = data["${key}"]\n`;
                    }
                }
                // eslint-disable-next-line no-new-func
                const loopFn = new Function('data', `${dataVars}let output = ''; for (${expr}) { output += \`${processedContent.replace(/`/g, '\\`')}\`; } return output;`);
                output = loopFn(data);
            } catch (e) {
                output = '';
            }
            return output;
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