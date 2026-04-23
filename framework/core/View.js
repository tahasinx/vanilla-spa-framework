class View {
    constructor() {
        this.templates = {};
        this.loadedTemplates = {};
        this.stacks = {};
        this.prepends = {};
        this.verbatimBlocks = [];
        this.currentSections = {};
        this.customDirectives = {};
        this.components = {};
        this.componentStack = [];
        this.sharedData = {};
        this.locale = 'en';
        this.fallbackLocale = 'en';
        this.langBasePath = 'resources/lang';
        this.translations = {};
        this.loadedLocaleGroups = {};
        this.renderCacheEnabled = false;
        this.renderCacheTtlMs = 0;
        this.renderCacheMaxEntries = 200;
        this.renderCache = new Map();
    }

    // Register a template
    register(name, template) {
        this.templates[name] = template;
        this.invalidateTemplateCache(name);
    }

    // Register reusable component templates/renderers.
    component(name, definition) {
        if (!name || !definition) {
            throw new Error('Component registration requires a name and definition.');
        }
        this.components[String(name).trim()] = definition;
    }

    share(key, value) {
        this.sharedData[key] = value;
    }

    setLocale(locale) {
        this.locale = String(locale || 'en');
    }

    setFallbackLocale(locale) {
        this.fallbackLocale = String(locale || 'en');
    }

    setLangBasePath(basePath) {
        this.langBasePath = String(basePath || 'resources/lang').replace(/\/+$/g, '');
    }

    setTranslations(locale, messages = {}) {
        const targetLocale = String(locale || 'en');
        this.translations[targetLocale] = { ...(this.translations[targetLocale] || {}), ...(messages || {}) };
    }

    enableRenderCache(options = {}) {
        this.renderCacheEnabled = true;
        if (Number.isFinite(options.ttlMs) && options.ttlMs >= 0) {
            this.renderCacheTtlMs = Number(options.ttlMs);
        }
        if (Number.isFinite(options.maxEntries) && options.maxEntries > 0) {
            this.renderCacheMaxEntries = Number(options.maxEntries);
        }
    }

    disableRenderCache() {
        this.renderCacheEnabled = false;
    }

    clearRenderCache() {
        this.renderCache.clear();
    }

    invalidateTemplateCache(templateName) {
        const templateKey = String(templateName || '').trim();
        if (!templateKey) {
            this.clearRenderCache();
            return;
        }
        for (const key of this.renderCache.keys()) {
            if (key.startsWith(`${templateKey}::`)) {
                this.renderCache.delete(key);
            }
        }
    }

    stableStringify(value) {
        if (value === null || value === undefined) {
            return String(value);
        }
        if (typeof value === 'function') {
            return '[Function]';
        }
        if (typeof value !== 'object') {
            return JSON.stringify(value);
        }
        if (Array.isArray(value)) {
            return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
        }
        const keys = Object.keys(value).sort();
        const pairs = keys.map((key) => `${JSON.stringify(key)}:${this.stableStringify(value[key])}`);
        return `{${pairs.join(',')}}`;
    }

    getRenderCacheKey(templateName, renderData) {
        return `${String(templateName)}::${this.stableStringify(renderData)}`;
    }

    getCachedRender(cacheKey) {
        const entry = this.renderCache.get(cacheKey);
        if (!entry) {
            return null;
        }
        if (this.renderCacheTtlMs > 0 && (Date.now() - entry.ts) > this.renderCacheTtlMs) {
            this.renderCache.delete(cacheKey);
            return null;
        }
        // LRU touch
        this.renderCache.delete(cacheKey);
        this.renderCache.set(cacheKey, entry);
        return entry.html;
    }

    setCachedRender(cacheKey, html) {
        if (!this.renderCacheEnabled) {
            return;
        }
        if (this.renderCache.size >= this.renderCacheMaxEntries) {
            const oldestKey = this.renderCache.keys().next().value;
            if (oldestKey !== undefined) {
                this.renderCache.delete(oldestKey);
            }
        }
        this.renderCache.set(cacheKey, {
            ts: Date.now(),
            html: String(html)
        });
    }

    flattenTranslations(input, prefix = '') {
        const output = {};
        if (!input || typeof input !== 'object') {
            return output;
        }
        Object.entries(input).forEach(([key, value]) => {
            const composed = prefix ? `${prefix}.${key}` : key;
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                Object.assign(output, this.flattenTranslations(value, composed));
            } else {
                output[composed] = value;
            }
        });
        return output;
    }

    async loadTranslationGroup(locale = this.locale, group = 'messages') {
        const targetLocale = String(locale || this.locale || 'en');
        const targetGroup = String(group || 'messages');
        const cacheKey = `${targetLocale}:${targetGroup}`;
        if (this.loadedLocaleGroups[cacheKey]) {
            return this.translations[targetLocale] || {};
        }

        const url = `${this.langBasePath}/${targetLocale}/${targetGroup}.json`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                this.loadedLocaleGroups[cacheKey] = true;
                return this.translations[targetLocale] || {};
            }
            const json = await response.json();
            const flattened = this.flattenTranslations(json, targetGroup);
            this.setTranslations(targetLocale, flattened);
            this.loadedLocaleGroups[cacheKey] = true;
            return this.translations[targetLocale] || {};
        } catch (error) {
            console.warn(`Failed to load translation file: ${url}`, error);
            this.loadedLocaleGroups[cacheKey] = true;
            return this.translations[targetLocale] || {};
        }
    }

    async loadTranslations(locale = this.locale, groups = ['messages']) {
        const targetLocale = String(locale || this.locale || 'en');
        const groupList = Array.isArray(groups) ? groups : [groups];
        await Promise.all(groupList.map((group) => this.loadTranslationGroup(targetLocale, group)));
        return this.translations[targetLocale] || {};
    }

    // Register custom Blade-like directive
    directive(name, handler) {
        if (!name || typeof handler !== 'function') {
            throw new Error('Directive requires a name and handler function.');
        }
        this.customDirectives[String(name).trim()] = handler;
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
            this.invalidateTemplateCache(name);
            return template;
        } catch (error) {
            console.error('Error loading template:', error);
            throw error;
        }
    }

    // Render a template with data
    render(templateName, data = {}) {
        const renderData = { ...this.sharedData, ...data };
        let template = this.templates[templateName];

        if (!template) {
            console.error(`Template '${templateName}' not found`);
            return '';
        }

        const cacheKey = this.getRenderCacheKey(templateName, renderData);
        if (this.renderCacheEnabled) {
            const cached = this.getCachedRender(cacheKey);
            if (cached !== null) {
                return cached;
            }
        }

        // Blade-like: Handle @extends, @section, @yield
        if (/@extends\(['"](.+?)['"]\)/.test(template)) {
            template = this.processExtends(template, renderData);
        }
        this.stacks = {};
        this.prepends = {};
        this.verbatimBlocks = [];
        this.currentSections = {};
        const rendered = this.renderContent(template, renderData);
        this.stacks = {};
        this.prepends = {};
        this.verbatimBlocks = [];
        this.currentSections = {};
        this.setCachedRender(cacheKey, rendered);
        return rendered;
    }

    resolveVariable(variable, data) {
        const cleanedVariable = variable.trim().replace(/^\$/, '');
        const keys = cleanedVariable.split('.');
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
        let rendered = this.processVerbatimBlocks(content);
        rendered = this.processBladeComments(rendered);
        rendered = this.processEscapedBladeTags(rendered);
        rendered = this.processLiveDirectives(rendered, data);
        const injectResult = this.processInjectDirectives(rendered, data);
        rendered = injectResult.template;
        const scopedData = injectResult.data;
        rendered = this.processComponentTags(rendered, scopedData);
        rendered = this.processClassAndStyleDirectives(rendered, scopedData);
        rendered = this.processConditionalAttributes(rendered, scopedData);
        rendered = this.processEventDirectives(rendered, scopedData);
        rendered = this.processCustomDirectives(rendered, scopedData);
        rendered = this.processIncludes(rendered, scopedData);
        rendered = this.processJsonAndJs(rendered, scopedData);
        rendered = this.processPushAndStack(rendered, scopedData);
        rendered = this.processSectionConditionals(rendered);
        rendered = this.processEnvironmentDirectives(rendered);
        rendered = this.processAuthorizationDirectives(rendered, scopedData);
        rendered = this.processSessionAndErrorDirectives(rendered, scopedData);
        rendered = this.processForLoops(rendered, scopedData);
        rendered = this.processWhileLoops(rendered, scopedData);
        rendered = this.processConditionals(rendered, scopedData);
        rendered = this.processLoops(rendered, scopedData);
        rendered = this.processCsrf(rendered);
        rendered = this.processMethod(rendered);
        rendered = this.processRouteAndAssetDirectives(rendered, scopedData);
        rendered = this.processLangAndChoiceDirectives(rendered, scopedData);

        // Raw output first (Laravel-style): {!! variable !!}
        rendered = rendered.replace(/\{!!\s*([^}]+)\s*!!\}/g, (match, variable) => {
            const value = this.resolveVariable(variable, scopedData);
            return value !== undefined ? String(value) : '';
        });

        // Escaped output (Laravel-style default): {{ variable }}
        rendered = rendered.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, variable) => {
            const value = this.resolveVariable(variable, scopedData);
            return this.escapeHtml(value !== undefined ? String(value) : '');
        });

        rendered = this.restoreVerbatimBlocks(rendered);
        return rendered;
    }

    processLiveDirectives(template, data) {
        return template.replace(/@live\s*\(([^)]+)\)/g, (match, argsRaw) => {
            const args = this.splitArguments(argsRaw);
            const url = args[0] ? this.resolveExpressionValue(args[0], data) : '';
            const target = args[1] ? this.resolveExpressionValue(args[1], data) : '__self__';
            const interval = args[2] ? this.resolveExpressionValue(args[2], data) : 5000;
            const responseType = args[3] ? this.resolveExpressionValue(args[3], data) : 'json';

            const safeUrl = this.escapeHtml(String(url || ''));
            if (!safeUrl) {
                return '';
            }

            const safeTarget = this.escapeHtml(String(target || '__self__'));
            const numericInterval = Number(interval);
            const safeInterval = Number.isFinite(numericInterval) ? numericInterval : 5000;
            const safeType = this.escapeHtml(String(responseType || 'json'));

            return `<div data-live-url="${safeUrl}" data-live-target="${safeTarget}" data-live-interval="${safeInterval}" data-live-response-type="${safeType}"></div>`;
        });
    }

    processConditionalAttributes(template, data) {
        const booleanAttributes = ['checked', 'selected', 'disabled', 'readonly', 'required'];
        let rendered = template;

        booleanAttributes.forEach((attr) => {
            const regex = new RegExp(`@${attr}\\s*\\(([^)]+)\\)`, 'g');
            rendered = rendered.replace(regex, (match, expression) => {
                const shouldApply = this.evaluateCondition(expression, data);
                return shouldApply ? attr : '';
            });
        });

        return rendered;
    }

    processEventDirectives(template, data) {
        let rendered = template;

        // Generic event directive: @on('click', handlerExpr)
        rendered = rendered.replace(/@on\s*\(([^,]+),\s*([\s\S]*?)\)/g, (match, eventExpr, handlerExpr) => {
            const eventName = String(this.resolveExpressionValue(eventExpr, data) || eventExpr || '')
                .replace(/^['"]|['"]$/g, '')
                .trim()
                .toLowerCase();
            const handlerValue = this.resolveExpressionValue(handlerExpr, data);
            const handler = handlerValue !== undefined ? handlerValue : String(handlerExpr || '').trim();

            if (!eventName || !handler) {
                return '';
            }

            return `on${this.escapeHtml(eventName)}="${this.escapeHtml(String(handler))}"`;
        });

        // Shorthand event directives: @onclick(...), @onchange(...), etc.
        rendered = rendered.replace(/@on([a-z]+)\s*\(([\s\S]*?)\)/g, (match, eventName, handlerExpr) => {
            const normalizedEvent = String(eventName || '').trim().toLowerCase();
            if (!normalizedEvent) {
                return match;
            }

            const handlerValue = this.resolveExpressionValue(handlerExpr, data);
            const handler = handlerValue !== undefined ? handlerValue : String(handlerExpr || '').trim();
            if (!handler) {
                return '';
            }

            return `on${this.escapeHtml(normalizedEvent)}="${this.escapeHtml(String(handler))}"`;
        });

        return rendered;
    }

    processCustomDirectives(template, data) {
        const names = Object.keys(this.customDirectives || {});
        if (!names.length) {
            return template;
        }

        let rendered = template;
        names.forEach((name) => {
            const withExpr = new RegExp(`@${name}\\s*\\(([^)]*)\\)`, 'g');
            rendered = rendered.replace(withExpr, (match, expression) => {
                try {
                    const result = this.customDirectives[name](expression, data, this);
                    return result === undefined || result === null ? '' : String(result);
                } catch (error) {
                    console.error(`Directive "@${name}" failed:`, error);
                    return '';
                }
            });

            const noExpr = new RegExp(`@${name}(?![\\w\\-])`, 'g');
            rendered = rendered.replace(noExpr, () => {
                try {
                    const result = this.customDirectives[name]('', data, this);
                    return result === undefined || result === null ? '' : String(result);
                } catch (error) {
                    console.error(`Directive "@${name}" failed:`, error);
                    return '';
                }
            });
        });

        return rendered;
    }

    processBladeComments(template) {
        return template.replace(/\{\{--[\s\S]*?--\}\}/g, '');
    }

    processEscapedBladeTags(template) {
        return template.replace(/@\{\{\s*([\s\S]*?)\s*\}\}/g, (match, inner) => `{{ ${inner} }}`);
    }

    normalizeClassValue(value) {
        if (!value) {
            return [];
        }
        if (typeof value === 'string') {
            return value.split(/\s+/).map((item) => item.trim()).filter(Boolean);
        }
        if (Array.isArray(value)) {
            return value.flatMap((item) => this.normalizeClassValue(item));
        }
        if (typeof value === 'object') {
            return Object.entries(value)
                .filter(([, enabled]) => Boolean(enabled))
                .flatMap(([name]) => this.normalizeClassValue(name));
        }
        return [];
    }

    normalizeStyleValue(value) {
        if (!value) {
            return [];
        }
        if (typeof value === 'string') {
            return [value.trim()].filter(Boolean);
        }
        if (Array.isArray(value)) {
            return value.flatMap((item) => this.normalizeStyleValue(item));
        }
        if (typeof value === 'object') {
            return Object.entries(value)
                .filter(([, styleValue]) => styleValue !== false && styleValue !== null && styleValue !== undefined && styleValue !== '')
                .map(([name, styleValue]) => `${name}: ${styleValue}`);
        }
        return [];
    }

    processClassAndStyleDirectives(template, data) {
        let rendered = template;
        rendered = rendered.replace(/@class\s*\(([\s\S]*?)\)/g, (match, expr) => {
            const resolved = this.resolveExpressionValue(expr, data);
            const classNames = Array.from(new Set(this.normalizeClassValue(resolved)));
            if (!classNames.length) {
                return '';
            }
            return `class="${this.escapeHtml(classNames.join(' '))}"`;
        });

        rendered = rendered.replace(/@style\s*\(([\s\S]*?)\)/g, (match, expr) => {
            const resolved = this.resolveExpressionValue(expr, data);
            const styles = this.normalizeStyleValue(resolved);
            if (!styles.length) {
                return '';
            }
            return `style="${this.escapeHtml(styles.join('; '))}"`;
        });

        return rendered;
    }

    processJsonAndJs(template, data) {
        template = template.replace(/@json\s*\(([^)]+)\)/g, (match, expression) => {
            const value = this.resolveExpressionValue(expression, data);
            return this.escapeHtml(JSON.stringify(value ?? null));
        });

        template = template.replace(/@js\s*\(([^)]+)\)/g, (match, expression) => {
            const value = this.resolveExpressionValue(expression, data);
            const json = JSON.stringify(value ?? null);
            return this.escapeHtml(json.replace(/</g, '\\u003c').replace(/>/g, '\\u003e'));
        });

        return template;
    }

    processInjectDirectives(template, data) {
        const scopedData = { ...data };
        const rendered = template.replace(/@inject\s*\(([^,]+),\s*([^)]+)\)/g, (match, variableExpr, serviceExpr) => {
            const variableName = String(this.resolveExpressionValue(variableExpr, scopedData) || variableExpr || '')
                .replace(/^['"]|['"]$/g, '')
                .trim();
            const serviceName = String(this.resolveExpressionValue(serviceExpr, scopedData) || serviceExpr || '')
                .replace(/^['"]|['"]$/g, '')
                .trim();
            if (!variableName || !serviceName) {
                return '';
            }

            if (window.Container && typeof window.Container.make === 'function') {
                try {
                    scopedData[variableName] = window.Container.make(serviceName);
                } catch (error) {
                    console.warn(`Failed to inject service "${serviceName}"`, error);
                }
            }
            return '';
        });

        return { template: rendered, data: scopedData };
    }

    getSessionStore(data = {}) {
        if (data && typeof data.session === 'object') {
            return data.session;
        }
        if (window.AppStore && typeof window.AppStore.getState === 'function') {
            const state = window.AppStore.getState();
            if (state && typeof state.session === 'object') {
                return state.session;
            }
        }
        return {};
    }

    getErrorStore(data = {}) {
        if (data && typeof data.errors === 'object') {
            return data.errors;
        }
        if (window.AppStore && typeof window.AppStore.getState === 'function') {
            const state = window.AppStore.getState();
            if (state && typeof state.errors === 'object') {
                return state.errors;
            }
        }
        return {};
    }

    getOldInputStore(data = {}) {
        if (data && typeof data.old === 'object') {
            return data.old;
        }
        if (data && typeof data.input === 'object') {
            return data.input;
        }
        if (window.AppStore && typeof window.AppStore.getState === 'function') {
            const state = window.AppStore.getState();
            if (state && typeof state.old === 'object') {
                return state.old;
            }
            if (state && typeof state.input === 'object') {
                return state.input;
            }
        }
        return {};
    }

    resolveOldValue(field, fallback, data = {}) {
        const oldStore = this.getOldInputStore(data);
        const value = this.getNestedValue(field, oldStore);
        if (value === undefined || value === null || value === '') {
            return fallback;
        }
        return value;
    }

    resolveErrorMessage(errors, field, bag = null) {
        const source = bag ? (errors[bag] || {}) : errors;
        const raw = this.getNestedValue(field, source);
        if (Array.isArray(raw)) {
            return raw[0];
        }
        return raw;
    }

    processSessionAndErrorDirectives(template, data) {
        let rendered = template;
        rendered = rendered.replace(/@old\s*\(([^)]+)\)/g, (match, argsRaw) => {
            const args = this.splitArguments(argsRaw);
            const field = String(this.resolveExpressionValue(args[0], data) || args[0] || '')
                .replace(/^['"]|['"]$/g, '')
                .trim();
            const fallback = args[1] !== undefined ? this.resolveExpressionValue(args[1], data) : '';
            const oldValue = this.resolveOldValue(field, fallback, data);
            return this.escapeHtml(oldValue !== undefined && oldValue !== null ? String(oldValue) : '');
        });

        rendered = rendered.replace(/@session\s*\(([^)]+)\)([\s\S]*?)@endsession/g, (match, keyExpr, content) => {
            const sessionKey = String(this.resolveExpressionValue(keyExpr, data) || keyExpr || '')
                .replace(/^['"]|['"]$/g, '')
                .trim();
            const session = this.getSessionStore(data);
            const sessionValue = sessionKey ? session[sessionKey] : undefined;
            if (sessionValue === undefined || sessionValue === null || sessionValue === '') {
                return '';
            }
            return this.renderContent(content, { ...data, sessionValue });
        });

        rendered = rendered.replace(/@error\s*\(([^)]+)\)([\s\S]*?)@enderror/g, (match, fieldExpr, content) => {
            const args = this.splitArguments(fieldExpr);
            const field = String(this.resolveExpressionValue(args[0], data) || args[0] || '')
                .replace(/^['"]|['"]$/g, '')
                .trim();
            const bag = args[1] !== undefined
                ? String(this.resolveExpressionValue(args[1], data) || args[1] || '').replace(/^['"]|['"]$/g, '').trim()
                : null;
            const errors = this.getErrorStore(data);
            const firstError = this.resolveErrorMessage(errors, field, bag);
            if (!firstError) {
                return '';
            }
            return this.renderContent(content, { ...data, error: firstError });
        });

        return rendered;
    }

    processRouteAndAssetDirectives(template, data) {
        let rendered = template;
        rendered = rendered.replace(/@route\s*\(([^)]+)\)/g, (match, argsRaw) => {
            const args = this.splitArguments(argsRaw);
            const name = this.resolveExpressionValue(args[0], data);
            const params = args[1] ? (this.resolveExpressionValue(args[1], data) || {}) : {};
            return this.resolveRoutePath(name, params);
        });

        rendered = rendered.replace(/@asset\s*\(([^)]+)\)/g, (match, pathExpr) => {
            const pathValue = this.resolveExpressionValue(pathExpr, data);
            return this.resolveAssetPath(pathValue);
        });

        return rendered;
    }

    translate(key, replacements = {}, locale = null) {
        const activeLocale = String(locale || this.locale || 'en');
        const fallbackLocale = String(this.fallbackLocale || 'en');
        const dictionary = this.translations[activeLocale] || {};
        const fallbackDictionary = this.translations[fallbackLocale] || {};
        let message = dictionary[key];
        if (message === undefined) {
            message = fallbackDictionary[key];
        }
        if (message === undefined) {
            message = key;
        }
        if (typeof message !== 'string') {
            message = String(message ?? key);
        }
        const replaceMap = replacements && typeof replacements === 'object' ? replacements : {};
        Object.entries(replaceMap).forEach(([token, value]) => {
            const normalizedValue = value === undefined || value === null ? '' : String(value);
            message = message.replace(new RegExp(`:${token}`, 'g'), normalizedValue);
        });
        return message;
    }

    translateChoice(key, count = 0, replacements = {}, locale = null) {
        const base = this.translate(key, {}, locale);
        const variants = String(base).split('|');
        const selected = Number(count) === 1 ? (variants[0] || base) : (variants[1] || variants[0] || base);
        return this.translate(selected, { ...replacements, count: Number(count) }, locale);
    }

    processLangAndChoiceDirectives(template, data) {
        let rendered = template;
        rendered = rendered.replace(/@lang\s*\(([^)]+)\)/g, (match, argsRaw) => {
            const args = this.splitArguments(argsRaw);
            const key = this.resolveExpressionValue(args[0], data);
            const replacements = args[1] ? (this.resolveExpressionValue(args[1], data) || {}) : {};
            return this.translate(String(key || ''), replacements);
        });

        rendered = rendered.replace(/@choice\s*\(([^)]+)\)/g, (match, argsRaw) => {
            const args = this.splitArguments(argsRaw);
            const key = this.resolveExpressionValue(args[0], data);
            const count = this.resolveExpressionValue(args[1], data);
            const replacements = args[2] ? (this.resolveExpressionValue(args[2], data) || {}) : {};
            return this.translateChoice(String(key || ''), Number(count || 0), replacements);
        });

        return rendered;
    }

    resolveRoutePath(name, params = {}) {
        const routeName = String(name || '').replace(/^['"]|['"]$/g, '').trim();
        if (!routeName) {
            return '';
        }
        if (window.route && typeof window.route === 'function') {
            try {
                return window.route(routeName, params || {});
            } catch (error) {
                console.warn(`Failed to resolve route "${routeName}"`, error);
            }
        }
        return routeName;
    }

    resolveAssetPath(pathValue) {
        const normalizedPath = String(pathValue || '').replace(/^['"]|['"]$/g, '').trim();
        if (!normalizedPath) {
            return '';
        }
        const appCtorConfig = window.App && window.App.constructor ? window.App.constructor.config : null;
        const appInstanceConfig = window.App && window.App.config ? window.App.config : null;
        const config = appCtorConfig || appInstanceConfig || {};
        const base = String(config.assetBaseUrl || '').replace(/\/+$/g, '');
        if (!base) {
            return normalizedPath;
        }
        const cleanPath = normalizedPath.replace(/^\/+/g, '');
        return `${base}/${cleanPath}`;
    }

    parseAttributesString(attributesRaw = '', data = {}) {
        const attributes = {};
        const attrRegex = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
        let match;

        while ((match = attrRegex.exec(attributesRaw)) !== null) {
            const key = match[1];
            const rawValue = match[2] ?? match[3] ?? match[4];
            if (rawValue === undefined) {
                attributes[key] = true;
                continue;
            }
            if (key.startsWith(':')) {
                attributes[key.slice(1)] = this.resolveExpressionValue(rawValue, data);
            } else {
                attributes[key] = rawValue;
            }
        }

        return attributes;
    }

    parseSlots(innerContent, data) {
        const slots = {};
        let cleanContent = innerContent;
        cleanContent = cleanContent.replace(/<x-slot\s+name=["']([^"']+)["']\s*>([\s\S]*?)<\/x-slot>/g, (match, slotName, slotBody) => {
            slots[slotName] = this.renderContent(slotBody, data);
            return '';
        });
        slots.default = this.renderContent(cleanContent, data);
        return slots;
    }

    resolveComponentDefinition(componentName) {
        const direct = this.components[componentName];
        if (direct) {
            return direct;
        }
        const templateName = `components.${componentName}`;
        if (this.templates[templateName]) {
            return templateName;
        }
        return null;
    }

    renderComponent(componentName, attrs = {}, innerContent = '', data = {}) {
        const definition = this.resolveComponentDefinition(componentName);
        if (!definition) {
            return '';
        }

        const slots = this.parseSlots(innerContent, data);
        const parentAware = this.componentStack.length ? this.componentStack[this.componentStack.length - 1] : {};
        const componentData = {
            ...data,
            ...attrs,
            slot: slots.default || '',
            slots,
            attributes: attrs,
            __props: attrs,
            __aware: parentAware
        };

        this.componentStack.push(componentData);
        let output = '';
        try {
            if (typeof definition === 'function') {
                output = definition(componentData, this);
            } else if (this.templates[definition]) {
                output = this.processComponentProps(this.templates[definition], componentData);
                output = this.renderContent(output, componentData);
            } else {
                output = this.processComponentProps(String(definition), componentData);
                output = this.renderContent(output, componentData);
            }
        } finally {
            this.componentStack.pop();
        }

        return output === undefined || output === null ? '' : String(output);
    }

    processComponentProps(template, componentData) {
        let rendered = template;
        rendered = rendered.replace(/@props\s*\((\{[\s\S]*?\})\)/g, (match, objectRaw) => {
            const defaults = this.parseObjectLiteral(objectRaw, componentData);
            Object.entries(defaults).forEach(([key, value]) => {
                if (componentData[key] === undefined) {
                    componentData[key] = value;
                }
            });
            return '';
        });

        rendered = rendered.replace(/@aware\s*\((\{[\s\S]*?\})\)/g, (match, objectRaw) => {
            const defaults = this.parseObjectLiteral(objectRaw, componentData);
            const awareSource = componentData.__aware || {};
            Object.entries(defaults).forEach(([key, fallback]) => {
                componentData[key] = awareSource[key] !== undefined ? awareSource[key] : fallback;
            });
            return '';
        });

        return rendered;
    }

    processComponentTags(template, data) {
        let rendered = template;

        rendered = rendered.replace(/<x-([\w.-]+)([^>]*)\/>/g, (match, name, attrsRaw) => {
            const attrs = this.parseAttributesString(attrsRaw, data);
            return this.renderComponent(name, attrs, '', data);
        });

        rendered = rendered.replace(/<x-([\w.-]+)([^>]*)>([\s\S]*?)<\/x-\1>/g, (match, name, attrsRaw, inner) => {
            const attrs = this.parseAttributesString(attrsRaw, data);
            return this.renderComponent(name, attrs, inner, data);
        });

        return rendered;
    }

    // Process conditional statements
    processConditionals(template, data) {
        template = this.processSwitchStatements(template, data);

        template = template.replace(/@auth([\s\S]*?)@endauth/g, (match, content) => {
            return window.Auth && typeof window.Auth.check === 'function' && window.Auth.check() ? content : '';
        });

        template = template.replace(/@guest([\s\S]*?)@endguest/g, (match, content) => {
            return window.Auth && typeof window.Auth.guest === 'function' && window.Auth.guest() ? content : '';
        });

        template = template.replace(/@isset\s*\(([^)]+)\)([\s\S]*?)@endisset/g, (match, expression, content) => {
            const value = this.resolveExpressionValue(expression, data);
            return value !== undefined && value !== null ? content : '';
        });

        template = template.replace(/@empty\s*\(([^)]+)\)([\s\S]*?)@endempty/g, (match, expression, content) => {
            const value = this.resolveExpressionValue(expression, data);
            if (Array.isArray(value)) {
                return value.length === 0 ? content : '';
            }
            return value ? '' : content;
        });

        template = template.replace(/@unless\s*\(([^)]+)\)([\s\S]*?)@endunless/g, (match, condition, content) => {
            const result = this.evaluateCondition(condition, data);
            return result ? '' : content;
        });

        // Handle @if/@elseif/@else chains.
        template = template.replace(/@if\s*\(([^)]+)\)([\s\S]*?)@endif/g, (match, firstCondition, chainBody) => {
            const branches = [];
            const elseifRegex = /@elseif\s*\(([^)]+)\)/g;
            let cursor = 0;
            let currentCondition = firstCondition;
            let elseifMatch;

            while ((elseifMatch = elseifRegex.exec(chainBody)) !== null) {
                const content = chainBody.slice(cursor, elseifMatch.index);
                branches.push({ condition: currentCondition, content });
                currentCondition = elseifMatch[1];
                cursor = elseifMatch.index + elseifMatch[0].length;
            }

            const elseIndex = chainBody.indexOf('@else', cursor);
            if (elseIndex >= 0) {
                branches.push({ condition: currentCondition, content: chainBody.slice(cursor, elseIndex) });
                branches.push({ condition: null, content: chainBody.slice(elseIndex + 5) });
            } else {
                branches.push({ condition: currentCondition, content: chainBody.slice(cursor) });
            }

            for (const branch of branches) {
                if (branch.condition === null || this.evaluateCondition(branch.condition, data)) {
                    return branch.content;
                }
            }

            return '';
        });

        return template;
    }

    // Process foreach loops
    processLoops(template, data) {
        // Handle @forelse statements
        template = template.replace(/@forelse\s*\(([^)]+)\)([\s\S]*?)(?:@empty([\s\S]*?))?@endforelse/g, (match, loopExpr, loopContent, emptyContent) => {
            const [arrayName, itemName] = loopExpr.split(' as ').map(s => s.trim());
            const array = this.getNestedValue(arrayName, data);

            if (!Array.isArray(array) || array.length === 0) {
                return emptyContent || '';
            }

            let output = '';
            for (let index = 0; index < array.length; index++) {
                const item = array[index];
                const loopData = {
                    ...data,
                    [itemName]: item,
                    loop: {
                        index,
                        iteration: index + 1,
                        first: index === 0,
                        last: index === array.length - 1,
                        count: array.length
                    }
                };
                const control = this.resolveLoopControl(loopContent, loopData);
                if (control.break) {
                    break;
                }
                if (control.continue) {
                    continue;
                }
                output += this.renderContent(control.content, loopData);
            }
            return output;
        });

        // Handle @foreach statements
        template = template.replace(/@foreach\s*\(([^)]+)\)([\s\S]*?)@endforeach/g, (match, loopExpr, loopContent) => {
            const [arrayName, itemName] = loopExpr.split(' as ').map(s => s.trim());
            const array = this.getNestedValue(arrayName, data);

            if (!Array.isArray(array)) {
                return '';
            }

            let output = '';
            for (const item of array) {
                const loopData = { ...data, [itemName]: item };
                const control = this.resolveLoopControl(loopContent, loopData);
                if (control.break) {
                    break;
                }
                if (control.continue) {
                    continue;
                }
                output += this.renderContent(control.content, loopData);
            }
            return output;
        });

        return template;
    }

    processWhileLoops(template, data) {
        return template.replace(/@while\s*\(([^)]+)\)([\s\S]*?)@endwhile/g, (match, conditionExpr, body) => {
            let output = '';
            let guard = 0;
            while (this.evaluateCondition(conditionExpr, data)) {
                guard++;
                if (guard > 1000) {
                    console.warn('Breaking @while loop after 1000 iterations for safety.');
                    break;
                }
                const control = this.resolveLoopControl(body, data);
                if (control.break) {
                    break;
                }
                if (!control.continue) {
                    output += this.renderContent(control.content, data);
                }
            }
            return output;
        });
    }

    resolveLoopControl(content, loopData) {
        let normalizedContent = content;
        let shouldContinue = false;
        let shouldBreak = false;

        normalizedContent = normalizedContent.replace(/@continue(?:\s*\(([^)]+)\))?/g, (match, condition) => {
            if (!condition || this.evaluateCondition(condition, loopData)) {
                shouldContinue = true;
            }
            return '';
        });

        normalizedContent = normalizedContent.replace(/@break(?:\s*\(([^)]+)\))?/g, (match, condition) => {
            if (!condition || this.evaluateCondition(condition, loopData)) {
                shouldBreak = true;
            }
            return '';
        });

        return {
            content: normalizedContent,
            continue: shouldContinue,
            break: shouldBreak
        };
    }

    resolveExpressionValue(expression, data) {
        const token = String(expression || '').trim();
        if (!token) {
            return undefined;
        }

        if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
            return token.slice(1, -1);
        }

        if (/^-?\d+(?:\.\d+)?$/.test(token)) {
            return Number(token);
        }

        if (token === 'true') return true;
        if (token === 'false') return false;
        if (token === 'null') return null;
        if (token === 'undefined') return undefined;
        if (token.startsWith('{') && token.endsWith('}')) {
            return this.parseObjectLiteral(token, data);
        }
        if (token.startsWith('[') && token.endsWith(']')) {
            const inner = token.slice(1, -1).trim();
            if (!inner) return [];
            return this.splitArguments(inner).map((part) => this.resolveExpressionValue(part, data));
        }
        if (token.startsWith('route(') && token.endsWith(')')) {
            const argsRaw = token.slice(6, -1);
            const args = this.splitArguments(argsRaw);
            const name = this.resolveExpressionValue(args[0], data);
            const params = args[1] ? (this.resolveExpressionValue(args[1], data) || {}) : {};
            return this.resolveRoutePath(name, params);
        }
        if (token.startsWith('asset(') && token.endsWith(')')) {
            const arg = token.slice(6, -1);
            const pathValue = this.resolveExpressionValue(arg, data);
            return this.resolveAssetPath(pathValue);
        }
        if (token.startsWith('__(') && token.endsWith(')')) {
            const args = this.splitArguments(token.slice(3, -1));
            const key = this.resolveExpressionValue(args[0], data);
            const replacements = args[1] ? (this.resolveExpressionValue(args[1], data) || {}) : {};
            return this.translate(String(key || ''), replacements);
        }
        if (token.startsWith('choice(') && token.endsWith(')')) {
            const args = this.splitArguments(token.slice(7, -1));
            const key = this.resolveExpressionValue(args[0], data);
            const count = this.resolveExpressionValue(args[1], data);
            const replacements = args[2] ? (this.resolveExpressionValue(args[2], data) || {}) : {};
            return this.translateChoice(String(key || ''), Number(count || 0), replacements);
        }
        if (token.startsWith('old(') && token.endsWith(')')) {
            const args = this.splitArguments(token.slice(4, -1));
            const field = String(this.resolveExpressionValue(args[0], data) || args[0] || '')
                .replace(/^['"]|['"]$/g, '')
                .trim();
            const fallback = args[1] !== undefined ? this.resolveExpressionValue(args[1], data) : '';
            return this.resolveOldValue(field, fallback, data);
        }
        if (token === 'auth()') return Boolean(window.Auth && typeof window.Auth.check === 'function' && window.Auth.check());
        if (token === 'guest()') return Boolean(window.Auth && typeof window.Auth.guest === 'function' && window.Auth.guest());

        // Null coalescing: a ?? b
        const nullCoalescing = this.splitTopLevelOperator(token, '??');
        if (nullCoalescing) {
            const leftValue = this.resolveExpressionValue(nullCoalescing.left, data);
            if (leftValue !== null && leftValue !== undefined && leftValue !== '') {
                return leftValue;
            }
            return this.resolveExpressionValue(nullCoalescing.right, data);
        }

        // Elvis operator: a ?: b
        const elvis = this.splitTopLevelOperator(token, '?:');
        if (elvis) {
            const leftValue = this.resolveExpressionValue(elvis.left, data);
            if (leftValue) {
                return leftValue;
            }
            return this.resolveExpressionValue(elvis.right, data);
        }

        const ternaryParts = this.splitTernaryExpression(token);
        if (ternaryParts) {
            const { condition, whenTrue, whenFalse } = ternaryParts;
            return this.evaluateCondition(condition, data)
                ? this.resolveExpressionValue(whenTrue, data)
                : this.resolveExpressionValue(whenFalse, data);
        }

        return this.getNestedValue(token, data);
    }

    splitTernaryExpression(expression) {
        const input = String(expression || '').trim();
        if (!input) {
            return null;
        }

        let quote = null;
        let depth = 0;
        let questionIndex = -1;
        let colonIndex = -1;

        for (let i = 0; i < input.length; i++) {
            const ch = input[i];
            if ((ch === '"' || ch === "'") && input[i - 1] !== '\\') {
                if (quote === ch) {
                    quote = null;
                } else if (!quote) {
                    quote = ch;
                }
                continue;
            }
            if (quote) {
                continue;
            }

            if (ch === '(' || ch === '[' || ch === '{') depth++;
            if (ch === ')' || ch === ']' || ch === '}') depth--;

            if (depth === 0 && ch === '?' && questionIndex < 0) {
                questionIndex = i;
                continue;
            }
            if (depth === 0 && ch === ':' && questionIndex >= 0) {
                colonIndex = i;
                break;
            }
        }

        if (questionIndex < 0 || colonIndex < 0) {
            return null;
        }

        return {
            condition: input.slice(0, questionIndex).trim(),
            whenTrue: input.slice(questionIndex + 1, colonIndex).trim(),
            whenFalse: input.slice(colonIndex + 1).trim()
        };
    }

    splitTopLevelOperator(expression, operator) {
        const input = String(expression || '').trim();
        if (!input || !operator) {
            return null;
        }

        let quote = null;
        let depth = 0;

        for (let i = 0; i <= input.length - operator.length; i++) {
            const ch = input[i];
            if ((ch === '"' || ch === "'") && input[i - 1] !== '\\') {
                if (quote === ch) {
                    quote = null;
                } else if (!quote) {
                    quote = ch;
                }
                continue;
            }

            if (quote) {
                continue;
            }

            if (ch === '(' || ch === '[' || ch === '{') depth++;
            if (ch === ')' || ch === ']' || ch === '}') depth--;

            if (depth === 0 && input.slice(i, i + operator.length) === operator) {
                return {
                    left: input.slice(0, i).trim(),
                    right: input.slice(i + operator.length).trim()
                };
            }
        }

        return null;
    }

    // Evaluate a condition
    evaluateCondition(condition, data) {
        const normalized = String(condition || '').trim();

        if (normalized.includes('||')) {
            return normalized.split('||').some((part) => this.evaluateCondition(part.trim(), data));
        }

        if (normalized.includes('&&')) {
            return normalized.split('&&').every((part) => this.evaluateCondition(part.trim(), data));
        }

        const parts = normalized.split(' ');
        if (parts.length === 3) {
            const [left, operator, right] = parts;
            const leftValue = this.resolveExpressionValue(left, data);
            const rightValue = this.resolveExpressionValue(right, data);

            switch (operator) {
                case '==':
                    return leftValue == rightValue;
                case '===':
                    return leftValue === rightValue;
                case '!=':
                    return leftValue != rightValue;
                case '!==':
                    return leftValue !== rightValue;
                case '>':
                    return leftValue > rightValue;
                case '>=':
                    return leftValue >= rightValue;
                case '<':
                    return leftValue < rightValue;
                case '<=':
                    return leftValue <= rightValue;
                default:
                    return Boolean(leftValue);
            }
        }

        return Boolean(this.resolveExpressionValue(normalized, data));
    }

    splitArguments(rawArgs = '') {
        const args = [];
        let current = '';
        let depth = 0;
        let quote = null;

        for (let i = 0; i < rawArgs.length; i++) {
            const ch = rawArgs[i];
            if ((ch === '"' || ch === "'") && rawArgs[i - 1] !== '\\') {
                if (quote === ch) {
                    quote = null;
                } else if (!quote) {
                    quote = ch;
                }
                current += ch;
                continue;
            }

            if (!quote) {
                if (ch === '(' || ch === '{' || ch === '[') depth++;
                if (ch === ')' || ch === '}' || ch === ']') depth--;
                if (ch === ',' && depth === 0) {
                    args.push(current.trim());
                    current = '';
                    continue;
                }
            }

            current += ch;
        }

        if (current.trim()) {
            args.push(current.trim());
        }

        return args;
    }

    getAppEnvironment() {
        const appCtorConfig = window.App && window.App.constructor ? window.App.constructor.config : null;
        const appInstanceConfig = window.App && window.App.config ? window.App.config : null;
        const config = appCtorConfig || appInstanceConfig || {};
        return String(config.env || 'development');
    }

    processSectionConditionals(template) {
        template = template.replace(/@hasSection\s*\(([^)]+)\)([\s\S]*?)@endif/g, (match, nameExpr, content) => {
            const name = String(this.resolveExpressionValue(nameExpr, {}) || '').replace(/['"]/g, '').trim();
            return this.currentSections[name] ? content : '';
        });

        template = template.replace(/@sectionMissing\s*\(([^)]+)\)([\s\S]*?)@endif/g, (match, nameExpr, content) => {
            const name = String(this.resolveExpressionValue(nameExpr, {}) || '').replace(/['"]/g, '').trim();
            return this.currentSections[name] ? '' : content;
        });

        return template;
    }

    processEnvironmentDirectives(template) {
        template = template.replace(/@production([\s\S]*?)@endproduction/g, (match, content) => {
            return this.getAppEnvironment() === 'production' ? content : '';
        });

        template = template.replace(/@env\s*\(([^)]+)\)([\s\S]*?)@endenv/g, (match, envExpr, content) => {
            const expected = String(this.resolveExpressionValue(envExpr, {}) || '').replace(/['"]/g, '').trim();
            return this.getAppEnvironment() === expected ? content : '';
        });

        return template;
    }

    canAbility(ability, data) {
        if (!window.Gate || typeof window.Gate.allows !== 'function') {
            return false;
        }
        return Boolean(window.Gate.allows(ability, data));
    }

    processAuthorizationDirectives(template, data) {
        template = template.replace(/@can\s*\(([^)]+)\)([\s\S]*?)@endcan/g, (match, abilityExpr, content) => {
            const ability = this.resolveExpressionValue(abilityExpr, data);
            return this.canAbility(ability, data) ? content : '';
        });

        template = template.replace(/@cannot\s*\(([^)]+)\)([\s\S]*?)@endcannot/g, (match, abilityExpr, content) => {
            const ability = this.resolveExpressionValue(abilityExpr, data);
            return this.canAbility(ability, data) ? '' : content;
        });

        template = template.replace(/@canany\s*\(([^)]+)\)([\s\S]*?)@endcanany/g, (match, abilitiesExpr, content) => {
            const abilities = this.resolveExpressionValue(abilitiesExpr, data);
            const list = Array.isArray(abilities) ? abilities : [abilities];
            const allowed = list.some((item) => this.canAbility(item, data));
            return allowed ? content : '';
        });

        return template;
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
                const control = this.resolveLoopControl(loopContent, loopData);
                if (control.break) {
                    break;
                }
                if (control.continue) {
                    continue;
                }
                output += this.renderContent(control.content, loopData);
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

    processSwitchStatements(template, data) {
        return template.replace(/@switch\s*\(([^)]+)\)([\s\S]*?)@endswitch/g, (match, expression, switchBody) => {
            const switchValue = this.resolveExpressionValue(expression, data);
            const caseRegex = /@case\s*\(([^)]+)\)([\s\S]*?)(?=@case\s*\(|@default|$)/g;
            let matchedContent = '';
            let caseMatch;

            while ((caseMatch = caseRegex.exec(switchBody)) !== null) {
                const caseValue = this.resolveExpressionValue(caseMatch[1], data);
                if (caseValue === switchValue) {
                    matchedContent = caseMatch[2].replace(/@break/g, '');
                    return this.renderContent(matchedContent, data);
                }
            }

            const defaultMatch = switchBody.match(/@default([\s\S]*)$/);
            if (defaultMatch) {
                return this.renderContent(defaultMatch[1], data);
            }

            return '';
        });
    }

    processPushAndStack(template, data) {
        template = template.replace(/@prepend\s*\(([^)]+)\)([\s\S]*?)@endprepend/g, (match, stackNameRaw, stackContent) => {
            const stackName = String(this.resolveExpressionValue(stackNameRaw, data) || stackNameRaw || '').replace(/['"]/g, '').trim();
            if (!stackName) {
                return '';
            }
            if (!this.prepends[stackName]) {
                this.prepends[stackName] = [];
            }
            this.prepends[stackName].push(this.renderContent(stackContent, data));
            return '';
        });

        template = template.replace(/@push\s*\(([^)]+)\)([\s\S]*?)@endpush/g, (match, stackNameRaw, stackContent) => {
            const stackName = String(this.resolveExpressionValue(stackNameRaw, data) || stackNameRaw || '').replace(/['"]/g, '').trim();
            if (!stackName) {
                return '';
            }
            if (!this.stacks[stackName]) {
                this.stacks[stackName] = [];
            }
            this.stacks[stackName].push(this.renderContent(stackContent, data));
            return '';
        });

        template = template.replace(/@stack\s*\(([^)]+)\)/g, (match, stackNameRaw) => {
            const stackName = String(stackNameRaw || '').replace(/['"]/g, '').trim();
            const prepended = (this.prepends[stackName] || []).join('');
            const pushed = (this.stacks[stackName] || []).join('');
            return prepended + pushed;
        });

        template = template.replace(/@once([\s\S]*?)@endonce/g, (match, content) => content);

        return template;
    }

    processCsrf(template) {
        return template.replace(/@csrf/g, () => {
            const token = (window.App && window.App.config && window.App.config.csrfToken) ? window.App.config.csrfToken : 'csrf-token';
            return `<input type="hidden" name="_token" value="${this.escapeHtml(token)}">`;
        });
    }

    processMethod(template) {
        return template.replace(/@method\s*\(([^)]+)\)/g, (match, methodExpr) => {
            const method = String(this.resolveExpressionValue(methodExpr, {}) || '').replace(/['"]/g, '').trim().toUpperCase();
            if (!method) {
                return '';
            }
            return `<input type="hidden" name="_method" value="${this.escapeHtml(method)}">`;
        });
    }

    processVerbatimBlocks(template) {
        return template.replace(/@verbatim([\s\S]*?)@endverbatim/g, (match, content) => {
            const key = `__VERBATIM_BLOCK_${this.verbatimBlocks.length}__`;
            this.verbatimBlocks.push(content);
            return key;
        });
    }

    restoreVerbatimBlocks(template) {
        return template.replace(/__VERBATIM_BLOCK_(\d+)__/g, (match, index) => {
            const content = this.verbatimBlocks[Number(index)];
            return content !== undefined ? content : '';
        });
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
        // Extract child sections: @section('name') ... @endsection/@show
        const sections = {};
        template.replace(/@section\(['"](.+?)['"]\)([\s\S]*?)@(endsection|show)/g, (match, name, content) => {
            sections[name] = content.trim();
            return '';
        });

        // Resolve layout-defined sections with defaults and @parent support.
        layout = layout.replace(/@section\(['"](.+?)['"]\)([\s\S]*?)@(show|endsection)/g, (match, name, defaultContent, closeType) => {
            const fallback = defaultContent.trim();
            if (sections[name]) {
                sections[name] = sections[name].replace(/@parent/g, fallback);
            } else {
                sections[name] = fallback;
            }
            return closeType === 'show' ? sections[name] : '';
        });

        this.currentSections = sections;

        // Replace @yield('name') in layout with resolved section content
        layout = layout.replace(/@yield\(['"](.+?)['"]\)/g, (match, name) => {
            return sections[name] || '';
        });
        return layout;
    }

    parseObjectLiteral(raw, data = {}) {
        const inner = String(raw || '').trim().replace(/^\{|\}$/g, '').trim();
        if (!inner) {
            return {};
        }
        const output = {};
        const pairs = this.splitArguments(inner);
        pairs.forEach((pair) => {
            const colonIndex = pair.indexOf(':');
            if (colonIndex < 0) {
                return;
            }
            const keyRaw = pair.slice(0, colonIndex).trim();
            const valueRaw = pair.slice(colonIndex + 1).trim();
            const key = keyRaw.replace(/^['"]|['"]$/g, '');
            output[key] = this.resolveExpressionValue(valueRaw, data);
        });
        return output;
    }

    resolveIncludeData(dataExpr, data) {
        if (!dataExpr) {
            return {};
        }
        const trimmed = dataExpr.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            return this.parseObjectLiteral(trimmed, data);
        }
        const resolved = this.resolveExpressionValue(trimmed, data);
        return resolved && typeof resolved === 'object' ? resolved : {};
    }

    renderInclude(partialNameRaw, dataExpr, parentData) {
        const partialName = String(this.resolveExpressionValue(partialNameRaw, parentData) || partialNameRaw || '').replace(/^['"]|['"]$/g, '').trim();
        const partial = this.templates[partialName];
        if (!partial) {
            return '';
        }
        const includeData = this.resolveIncludeData(dataExpr, parentData);
        return this.renderContent(partial, { ...parentData, ...includeData });
    }

    // Blade-like includes
    processIncludes(template, data) {
        template = template.replace(/@includeIf\s*\(([^,]+)(?:,\s*([\s\S]*?))?\)/g, (match, partialNameExpr, dataExpr) => {
            const partialName = String(this.resolveExpressionValue(partialNameExpr, data) || partialNameExpr || '').replace(/^['"]|['"]$/g, '').trim();
            if (!this.templates[partialName]) {
                return '';
            }
            return this.renderInclude(partialNameExpr, dataExpr, data);
        });

        template = template.replace(/@includeWhen\s*\(([^,]+),\s*([^,]+)(?:,\s*([\s\S]*?))?\)/g, (match, conditionExpr, partialNameExpr, dataExpr) => {
            if (!this.evaluateCondition(conditionExpr, data)) {
                return '';
            }
            return this.renderInclude(partialNameExpr, dataExpr, data);
        });

        template = template.replace(/@includeUnless\s*\(([^,]+),\s*([^,]+)(?:,\s*([\s\S]*?))?\)/g, (match, conditionExpr, partialNameExpr, dataExpr) => {
            if (this.evaluateCondition(conditionExpr, data)) {
                return '';
            }
            return this.renderInclude(partialNameExpr, dataExpr, data);
        });

        template = template.replace(/@each\s*\(([^,]+),\s*([^,]+),\s*([^,]+)(?:,\s*([^,]+))?\)/g, (match, viewExpr, listExpr, itemExpr, emptyExpr) => {
            const list = this.resolveExpressionValue(listExpr, data);
            const itemName = String(this.resolveExpressionValue(itemExpr, data) || itemExpr || '').replace(/^['"]|['"]$/g, '').trim();
            if (Array.isArray(list) && list.length) {
                return list.map((entry, index) => {
                    const rowData = { ...data, [itemName]: entry, loop: { index, iteration: index + 1, first: index === 0, last: index === list.length - 1, count: list.length } };
                    return this.renderInclude(viewExpr, null, rowData);
                }).join('');
            }
            if (emptyExpr) {
                return this.renderInclude(emptyExpr, null, data);
            }
            return '';
        });

        template = template.replace(/@include\s*\(([^,]+)(?:,\s*([\s\S]*?))?\)/g, (match, partialNameExpr, dataExpr) => {
            return this.renderInclude(partialNameExpr, dataExpr, data);
        });

        return template;
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