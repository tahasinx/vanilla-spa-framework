class Validator {
    constructor() {
        this.defaultMessages = {
            required: 'The :field field is required.',
            email: 'The :field must be a valid email address.',
            min: 'The :field must be at least :param characters.',
            max: 'The :field may not be greater than :param characters.',
            numeric: 'The :field must be numeric.',
            url: 'The :field must be a valid URL.',
            in: 'The :field must be one of: :param.'
        };
    }

    validate(data = {}, rules = {}, customMessages = {}) {
        const errors = {};

        for (const [field, ruleSet] of Object.entries(rules)) {
            const value = data[field];
            const parsedRules = this.parseRules(ruleSet);

            for (const rule of parsedRules) {
                const passed = this.applyRule(rule.name, value, rule.param);
                if (!passed) {
                    if (!errors[field]) {
                        errors[field] = [];
                    }

                    const customKey = `${field}.${rule.name}`;
                    const messageTemplate = customMessages[customKey]
                        || customMessages[field]
                        || this.defaultMessages[rule.name]
                        || 'The :field field is invalid.';

                    errors[field].push(
                        this.formatMessage(messageTemplate, field, rule.param)
                    );
                }
            }
        }

        return {
            passes: Object.keys(errors).length === 0,
            fails: Object.keys(errors).length > 0,
            errors
        };
    }

    parseRules(ruleSet) {
        if (Array.isArray(ruleSet)) {
            return ruleSet.map((rule) => this.parseSingleRule(rule));
        }
        return String(ruleSet)
            .split('|')
            .map((rule) => this.parseSingleRule(rule.trim()))
            .filter((rule) => rule.name);
    }

    parseSingleRule(rule) {
        const [name, param = ''] = String(rule).split(':');
        return { name: name.trim(), param: param.trim() };
    }

    applyRule(ruleName, value, param) {
        const normalizedValue = value === undefined || value === null ? '' : String(value);

        switch (ruleName) {
            case 'required':
                return normalizedValue.trim().length > 0;
            case 'email':
                if (!normalizedValue.trim()) return true;
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedValue);
            case 'min':
                if (!normalizedValue.trim()) return true;
                return normalizedValue.length >= Number(param || 0);
            case 'max':
                if (!normalizedValue.trim()) return true;
                return normalizedValue.length <= Number(param || Number.MAX_SAFE_INTEGER);
            case 'numeric':
                if (!normalizedValue.trim()) return true;
                return !Number.isNaN(Number(normalizedValue));
            case 'url':
                if (!normalizedValue.trim()) return true;
                try {
                    const parsed = new URL(normalizedValue);
                    return !!parsed;
                } catch (error) {
                    return false;
                }
            case 'in':
                if (!normalizedValue.trim()) return true;
                return String(param)
                    .split(',')
                    .map((item) => item.trim())
                    .includes(normalizedValue);
            default:
                // Unknown rules are treated as pass so apps don't break.
                return true;
        }
    }

    formatMessage(template, field, param) {
        const label = field.replace(/[_-]+/g, ' ');
        return template
            .replace(/:field/g, label)
            .replace(/:param/g, param || '');
    }
}

window.Validator = window.Validator || new Validator();
