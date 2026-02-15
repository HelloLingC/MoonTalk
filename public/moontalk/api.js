export class ApiClient {
    constructor(server) {
        this.server = server.endsWith('/') ? server.slice(0, -1) : server;
    }

    async requestJson(path, options = {}) {
        const response = await fetch(`${this.server}${path}`, options);

        let payload = null;
        try {
            payload = await response.json();
        } catch (_) {
            payload = null;
        }

        if (!response.ok) {
            const message = payload?.error?.message || `HTTP error - status: ${response.status}`;
            const error = new Error(message);
            error.code = payload?.error?.code;
            error.status = response.status;
            error.details = payload?.error?.details;
            throw error;
        }

        return payload;
    }

    async createComment(postId, comment) {
        const payload = await this.requestJson(`/api/v2/posts/${encodeURIComponent(postId)}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(comment),
        });
        return payload.data;
    }

    async getComments(postId, page, limit) {
        const query = new URLSearchParams({
            page: String(page),
            limit: String(limit),
        });

        const payload = await this.requestJson(`/api/v2/posts/${encodeURIComponent(postId)}/comments?${query.toString()}`);
        return {
            comments: payload.data || [],
            meta: payload.meta || {},
        };
    }

    async getLatestComments(site, limit) {
        const query = new URLSearchParams({
            limit: String(limit),
        });
        if (site) {
            query.set('site', site);
        }

        const payload = await this.requestJson(`/api/v2/comments/latest?${query.toString()}`);
        return payload.data || [];
    }

    async getVotes(postId) {
        const payload = await this.requestJson(`/api/v2/posts/${encodeURIComponent(postId)}/votes`);
        return payload.data;
    }

    async setVote(postId, value) {
        const payload = await this.requestJson(`/api/v2/posts/${encodeURIComponent(postId)}/vote`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ value }),
        });
        return payload.data;
    }
}
