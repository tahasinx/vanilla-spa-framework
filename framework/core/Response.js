class ResponseFactory {
    json(data = {}, status = 200) {
        return {
            data,
            status,
            type: 'json'
        };
    }

    html(html = '', status = 200) {
        return {
            data: String(html),
            status,
            type: 'html'
        };
    }

    error(message = 'Server Error', status = 500, extra = {}) {
        return {
            data: {
                error: String(message),
                ...extra
            },
            status,
            type: 'json'
        };
    }
}

window.response = () => new ResponseFactory();
