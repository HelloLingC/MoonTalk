import { ApiClient } from './api.js';
import { createInitialState } from './state.js';
import { clearChildren, normalizeVoteState, resolveElement, setVisible } from './dom.js';
import { renderComments } from './render-comments.js';
import { renderLatestComments } from './render-latest.js';
import { renderVoteState } from './render-votes.js';

const DEFAULT_OPTIONS = {
    server: 'https://moontalk.net',
    postId: '',
    siteName: '',
    latestCommentsLimit: 5,
    pageSize: 10,
    element: '#moontalk',
};

export class MoonTalk {
    constructor(options = {}) {
        this.options = {
            ...DEFAULT_OPTIONS,
            ...options,
        };

        this.state = createInitialState(this.options.pageSize);
        this.boundClickHandler = (event) => this.handleClick(event);
    }

    async mount() {
        this.validateOptions();

        this.container = resolveElement(this.options.element);
        if (!this.container) {
            throw new Error(`Element "${this.options.element}" not found`);
        }

        this.api = new ApiClient(this.options.server);

        this.loadStyles();
        const html = await this.fetchTemplate();
        this.container.innerHTML = html;
        this.root = this.container.querySelector('.moontalk') || this.container;

        this.captureRefs();
        this.bindEvents();

        await Promise.allSettled([
            this.loadComments(),
            this.loadLatestComments(),
            this.loadVotes(),
        ]);

        return this;
    }

    validateOptions() {
        if (!this.options.server) {
            throw new Error('missed argument: server');
        }
        if (!(this.options.server.startsWith('http://') || this.options.server.startsWith('https://'))) {
            throw new Error('server must start with http:// or https://');
        }
        if (!this.options.postId) {
            throw new Error('missed argument: postId');
        }
        if (!this.options.element) {
            throw new Error('missed argument: element');
        }
        this.options.server = this.options.server.endsWith('/')
            ? this.options.server.slice(0, -1)
            : this.options.server;
    }

    async fetchTemplate() {
        const response = await fetch(`${this.options.server}/header.html`);
        if (!response.ok) {
            throw new Error(`Failed to load template: ${response.status}`);
        }
        return response.text();
    }

    loadStyles() {
        const href = `${this.options.server}/main.css`;
        const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .find((link) => link.href === href);
        if (existing) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }

    captureRefs() {
        this.refs = {
            list: this.root.querySelector('.moontalk-list'),
            count: this.root.querySelector('.moontalk-count'),
            empty: this.root.querySelector('.moontalk-empty'),
            loading: this.root.querySelector('.moontalk-loading'),
            error: this.root.querySelector('.moontalk-error'),
            errorMessage: this.root.querySelector('.moontalk-error-message'),
            success: this.root.querySelector('.moontalk-success'),
            submit: this.root.querySelector('.moontalk-submit'),
            content: this.root.querySelector('.moontalk-content'),
            name: this.root.querySelector('.moontalk-name'),
            email: this.root.querySelector('.moontalk-email'),
            website: this.root.querySelector('.moontalk-website'),
            editor: this.root.querySelector('.moontalk-editor'),
            prevButton: this.root.querySelector('.moontalk-paginator-prev'),
            nextButton: this.root.querySelector('.moontalk-paginator-next'),
            paginatorInfo: this.root.querySelector('.moontalk-paginator-info'),
            latestWidget: this.root.querySelector('.moontalk-latest-widget'),
            latestLoading: this.root.querySelector('.moontalk-latest-loading'),
            latestEmpty: this.root.querySelector('.moontalk-latest-empty'),
            latestList: this.root.querySelector('.moontalk-latest-list'),
            upvoteButton: this.root.querySelector('.vote-btn.upvote'),
            downvoteButton: this.root.querySelector('.vote-btn.downvote'),
            upvoteCount: this.root.querySelector('.vote-btn.upvote .vote-count'),
            downvoteCount: this.root.querySelector('.vote-btn.downvote .vote-count'),
        };
    }

    bindEvents() {
        this.root.removeEventListener('click', this.boundClickHandler);
        this.root.addEventListener('click', this.boundClickHandler);
    }

    async handleClick(event) {
        const target = event.target;
        const submit = target.closest('.moontalk-submit');
        if (submit) {
            await this.submitComment();
            return;
        }

        const prev = target.closest('.moontalk-paginator-prev');
        if (prev) {
            await this.goToPreviousPage();
            return;
        }

        const next = target.closest('.moontalk-paginator-next');
        if (next) {
            await this.goToNextPage();
            return;
        }

        const reply = target.closest('.moontalk-comment-reply');
        if (reply) {
            this.prepareReply(reply);
            return;
        }

        const upvote = target.closest('.vote-btn.upvote');
        if (upvote) {
            await this.submitVote(1);
            return;
        }

        const downvote = target.closest('.vote-btn.downvote');
        if (downvote) {
            await this.submitVote(-1);
        }
    }

    setLoading(loading) {
        setVisible(this.refs.loading, loading);
    }

    showError(message) {
        if (!message) {
            setVisible(this.refs.error, false);
            this.refs.errorMessage.textContent = '';
            return;
        }

        this.refs.errorMessage.textContent = String(message);
        setVisible(this.refs.error, true);
    }

    showSuccess() {
        setVisible(this.refs.success, true);
        setTimeout(() => {
            setVisible(this.refs.success, false);
        }, 3000);
    }

    updatePaginationUI() {
        const totalPages = this.state.comments.totalPages;
        const currentPage = this.state.comments.currentPage;
        const displayPage = totalPages === 0 ? 0 : currentPage;

        this.refs.paginatorInfo.textContent = `Page ${displayPage} of ${totalPages}`;
        this.refs.prevButton.disabled = currentPage <= 1 || totalPages === 0;
        this.refs.nextButton.disabled = currentPage >= totalPages || totalPages === 0;
        this.refs.count.textContent = String(this.state.comments.totalComments);
    }

    prepareReply(button) {
        const parentId = Number.parseInt(button.dataset.parentId, 10);
        const replyTo = Number.parseInt(button.dataset.commentId, 10);
        const username = button.dataset.username || 'anonymous';

        this.state.reply.parentId = Number.isInteger(parentId) ? parentId : null;
        this.state.reply.replyTo = Number.isInteger(replyTo) ? replyTo : null;
        this.state.reply.mention = `@${username} `;

        this.refs.content.value = this.state.reply.mention;
        this.refs.editor.scrollIntoView({ behavior: 'smooth' });
        this.refs.content.focus();
    }

    resetReply() {
        this.state.reply.parentId = null;
        this.state.reply.replyTo = null;
        this.state.reply.mention = '';
    }

    getLatestSiteFilter() {
        if (this.options.siteName && this.options.siteName.trim()) {
            return this.options.siteName.trim();
        }

        try {
            return new URL(this.options.postId).hostname;
        } catch (_) {
            const normalized = this.options.postId.replace(/^https?:\/\//i, '');
            return normalized.split('/')[0];
        }
    }

    async submitComment() {
        this.refs.submit.disabled = true;
        this.refs.submit.innerText = 'Submitting...';
        this.showError('');

        try {
            let content = this.refs.content.value;
            if (this.state.reply.parentId && content.startsWith(this.state.reply.mention)) {
                content = content.slice(this.state.reply.mention.length);
            }

            await this.api.createComment(this.options.postId, {
                content,
                username: this.refs.name.value,
                email: this.refs.email.value,
                website: this.refs.website.value,
                parent_id: this.state.reply.parentId,
                reply_to: this.state.reply.replyTo,
            });

            this.resetReply();
            this.refs.content.value = '';
            this.showSuccess();

            await Promise.all([
                this.loadComments(),
                this.loadLatestComments(),
            ]);
        } catch (error) {
            this.showError(error.message || 'Failed to submit comment');
        } finally {
            this.refs.submit.disabled = false;
            this.refs.submit.innerText = 'Submit';
        }
    }

    async loadComments() {
        this.setLoading(true);
        this.showError('');

        try {
            const { comments, meta } = await this.api.getComments(
                this.options.postId,
                this.state.comments.currentPage,
                this.state.comments.pageSize,
            );

            this.state.comments.totalPages = meta.totalPages || 0;
            this.state.comments.totalComments = meta.totalComments || 0;

            renderComments(this.refs.list, comments);
            setVisible(this.refs.empty, comments.length === 0);
            this.updatePaginationUI();
        } catch (error) {
            clearChildren(this.refs.list);
            setVisible(this.refs.empty, true);
            this.showError(error.message || 'Failed to load comments');
        } finally {
            this.setLoading(false);
        }
    }

    async goToPreviousPage() {
        if (this.state.comments.currentPage <= 1) return;
        this.state.comments.currentPage -= 1;
        await this.loadComments();
    }

    async goToNextPage() {
        if (this.state.comments.currentPage >= this.state.comments.totalPages) return;
        this.state.comments.currentPage += 1;
        await this.loadComments();
    }

    async loadLatestComments() {
        if (!this.refs.latestWidget) return;

        setVisible(this.refs.latestLoading, true);
        setVisible(this.refs.latestEmpty, false);
        clearChildren(this.refs.latestList);

        try {
            const site = this.getLatestSiteFilter();
            const comments = await this.api.getLatestComments(site, this.options.latestCommentsLimit);

            if (!comments.length) {
                setVisible(this.refs.latestEmpty, true);
                return;
            }

            renderLatestComments(this.refs.latestList, comments);
        } catch (_) {
            setVisible(this.refs.latestEmpty, true);
        } finally {
            setVisible(this.refs.latestLoading, false);
        }
    }

    async loadVotes() {
        this.state.vote.loading = true;
        renderVoteState(this.refs, this.state.vote);

        try {
            const vote = await this.api.getVotes(this.options.postId);
            this.state.vote = {
                ...this.state.vote,
                ...normalizeVoteState(vote),
                loading: false,
            };
        } catch (error) {
            this.state.vote.loading = false;
            this.showError(error.message || 'Failed to load votes');
        }

        renderVoteState(this.refs, this.state.vote);
    }

    async submitVote(targetVote) {
        if (this.state.vote.loading) return;

        const nextVote = this.state.vote.userVote === targetVote ? 0 : targetVote;
        this.state.vote.loading = true;
        this.showError('');
        renderVoteState(this.refs, this.state.vote);

        try {
            const vote = await this.api.setVote(this.options.postId, nextVote);
            this.state.vote = {
                ...this.state.vote,
                ...normalizeVoteState(vote),
                loading: false,
            };
        } catch (error) {
            this.state.vote.loading = false;
            this.showError(error.message || 'Failed to submit vote');
        }

        renderVoteState(this.refs, this.state.vote);
    }
}

export default MoonTalk;
