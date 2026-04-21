class AuthService {
    constructor() {
        this.storageKey = 'vsf.auth';
    }

    getState() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) {
                return { loggedIn: false, user: null };
            }
            const parsed = JSON.parse(raw);
            return {
                loggedIn: !!parsed.loggedIn,
                user: parsed.user || null
            };
        } catch (error) {
            return { loggedIn: false, user: null };
        }
    }

    setState(state) {
        localStorage.setItem(this.storageKey, JSON.stringify(state));
    }

    login(user = { name: 'Demo User', role: 'member' }) {
        this.setState({
            loggedIn: true,
            user
        });
        return user;
    }

    logout() {
        this.setState({
            loggedIn: false,
            user: null
        });
    }

    check() {
        return this.getState().loggedIn;
    }

    user() {
        return this.getState().user;
    }

    guest() {
        return !this.check();
    }
}

window.Auth = new AuthService();
