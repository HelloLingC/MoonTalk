class MoonTalk {
    constructor() {
        this.conf = {};
        this.currentPage = 0;
        this.totalPages = 0;
        this.vote = {
            upvotes: 0,
            downvotes: 0,
            userVote: 0,
            loading: false,
        };
    }

    init(options) {
        this.conf = {
            ...this.getDefaultOptions(),
            ...options,
        };
        if (!this.conf.server) throw new Error('missed argument: url');
        if(!(this.conf.server.startsWith('http://') || this.conf.server.startsWith('https://'))) {
            throw new Error('url must start with http:// or https://');
        }
        if (!this.conf.page_key) throw new Error('missed argument: page_key');
        if (!this.conf.element) throw new Error('missed argument: element');

        if (this.conf.server.endsWith('/')) {
            this.conf.server = this.conf.server.slice(0, -1);
        }

        if (!this.conf.pageTitle) {
            this.conf.pageTitle = document.title || 'Unknown Webpage Title';
        }

        this.initEl();
        this.loadStyles();
        // this.loadComments();
    }

    initEl() {
        const container = typeof this.conf.element === 'string'
        ? document.querySelector(this.conf.element) : this.conf.element;
        if(!container) throw new Error(`Element "${this.conf.el}" not found`);
        console.log(container)
        this.el = container;
        this.el.innerHTML = '';

        const url = this.conf.server + '/header.html';
        const resp = fetch(url).then(resp => {
            if (!resp.ok) {
                throw new Error(`HTTP error - status: ${resp.status}`);
            }
            return resp.text();
        }).then(html => {
            this.el.innerHTML = html;
            this.latestWidgetEl = this.el.querySelector('.moontalk-latest-widget');
            this.el.querySelector('.moontalk-submit').addEventListener('click', ()=> {
                this.onSubmit(this);
            })
            this.el.querySelector('.moontalk-paginator-prev').addEventListener('click', () => {
                this.goToPreviousPage();
            })
            this.el.querySelector('.moontalk-paginator-next').addEventListener('click', () => {
                this.goToNextPage();
            })
            this.initVoteWidget();
            this.el_ok = true;
            this.loadComments();
            this.loadLatestComments();
            this.loadPostVotes();
        })
    }

    initVoteWidget() {
        this.upvoteBtn = this.el.querySelector('.vote-btn.upvote');
        this.downvoteBtn = this.el.querySelector('.vote-btn.downvote');

        if (!this.upvoteBtn || !this.downvoteBtn) return;

        this.upvoteCountEl = this.upvoteBtn.querySelector('.vote-count');
        this.downvoteCountEl = this.downvoteBtn.querySelector('.vote-count');

        this.upvoteBtn.addEventListener('click', () => {
            this.submitVote(1);
        });
        this.downvoteBtn.addEventListener('click', () => {
            this.submitVote(-1);
        });

        this.updateVoteUI();
    }

    normalizeVoteSummary(summary) {
        const userVote = Number(summary?.userVote);
        return {
            upvotes: Number(summary?.upvotes) || 0,
            downvotes: Number(summary?.downvotes) || 0,
            userVote: [-1, 0, 1].includes(userVote) ? userVote : 0,
        };
    }

    updateVoteUI() {
        if (!this.upvoteBtn || !this.downvoteBtn) return;

        if (this.upvoteCountEl) {
            this.upvoteCountEl.textContent = this.vote.upvotes;
        }
        if (this.downvoteCountEl) {
            this.downvoteCountEl.textContent = this.vote.downvotes;
        }
        this.upvoteBtn.classList.toggle('active', this.vote.userVote === 1);
        this.downvoteBtn.classList.toggle('active', this.vote.userVote === -1);
    }

    setVoteLoading(loading) {
        this.vote.loading = loading;
        if (!this.upvoteBtn || !this.downvoteBtn) return;
        this.upvoteBtn.disabled = loading;
        this.downvoteBtn.disabled = loading;
    }

    async loadPostVotes() {
        if (!this.upvoteBtn || !this.downvoteBtn) return;
        this.setVoteLoading(true);
        try {
            const resp = await fetch(`${this.conf.server}/comments/votes?postId=${encodeURIComponent(this.conf.page_key)}`);
            const data = await resp.json();
            if (!resp.ok) {
                throw new Error(data?.message || `HTTP error - status: ${resp.status}`);
            }

            this.vote = {
                ...this.vote,
                ...this.normalizeVoteSummary(data),
            };
            this.updateVoteUI();
        } catch (err) {
            console.error('Failed to load votes:', err);
            this.showError(err.message || 'Failed to load votes');
        } finally {
            this.setVoteLoading(false);
        }
    }

    async submitVote(targetVote) {
        if (this.vote.loading) return;
        const nextVote = this.vote.userVote === targetVote ? 0 : targetVote;
        this.showError('');
        this.setVoteLoading(true);

        try {
            const resp = await fetch(`${this.conf.server}/comments/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    post_id: this.conf.page_key,
                    value: nextVote,
                }),
            });

            const data = await resp.json();
            if (!resp.ok) {
                throw new Error(data?.message || `HTTP error - status: ${resp.status}`);
            }

            this.vote = {
                ...this.vote,
                ...this.normalizeVoteSummary(data),
            };
            this.updateVoteUI();
        } catch (err) {
            console.error('Failed to submit vote:', err);
            this.showError(err.message || 'Failed to submit vote');
        } finally {
            this.setVoteLoading(false);
        }
    }

    loadStyles() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://comment.moonlab.top/main.css';
        // link.onload = resolve;
        // link.onerror = reject;
        document.head.appendChild(link); // Insert to <head>
    }

    async onSubmit(self) {
        self.el.querySelector('.moontalk-submit').disabled = true;
        self.el.querySelector('.moontalk-submit').innerText = 'Submitting...';
        this.showError('');
        let content = self.el.querySelector('.moontalk-content').value;
        if(self.parent_id && content.startsWith(self.reply_to_username)) {
            content = content.replace(self.reply_to_username, '');
        }
        fetch(self.conf.server + "/comments/create", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: content,
                post_id: self.conf.page_key,
                username: self.el.querySelector('.moontalk-name').value,
                email: self.el.querySelector('.moontalk-email').value,
                website: self.el.querySelector('.moontalk-website').value,
                parent_id: self.parent_id,
                reply_to: self.reply_to,
            }),
        }).then(resp => {
            if (!resp.ok) {
                return resp.json().then(errorData => {
                    throw new Error(errorData.message || 'Request failed');
                  });
            }
            this.onSuccess();
        }).catch(error => {
            this.showError(error);
        }).finally(() => {
            this.el.querySelector('.moontalk-submit').disabled = false;
            this.el.querySelector('.moontalk-submit').innerText = 'Submit';
        })
    }

    async loadComments() {
        this.showError('');
        this.showLoading(true);
        if(this.currentPage == 0) {
            const resp = await fetch(`${this.conf.server}/comments/num?postId=${this.conf.page_key}`)
            const data = await resp.json();
            if (!resp.ok) {
                throw new Error(`HTTP error - status: ${resp.status} ${data}`);
            }
            this.totalPages = data.totalPages;
            if(this.totalPages !== 0) {
                this.currentPage++;
            }
            document.querySelector('.moontalk-count').textContent = data.count;
            this.updatePaginationUI();
        }

        try {
            const resp = await fetch(`${this.conf.server}/comments/list?postId=${this.conf.page_key}&page=${this.currentPage}`)
            if (!resp.ok) {
                throw new Error(`HTTP error - status: ${resp.status}`);
            }
            const data = await resp.json();
            if(data.message) {
                document.querySelector('.moontalk-empty').style.display = 'block';
                return;
            }
            this.renderRootComments(data);
        } catch (err) {
            console.error(err);
            this.showError(err);
        } finally {
            this.showLoading(false);
        }
    }

    onSuccess() {
        const successMsg = this.el.querySelector('.moontalk-success');
        console.log(successMsg);
        successMsg.style.display = 'block';

        // Hide after 3 seconds
        setTimeout(() => {
            successMsg.style.display = 'none';
        }, 3000);
    }

    showLoading(show) {
        document.querySelector('.moontalk-loading').style.display = show ? 'block' : 'none';
    }

    showError(error) {
        if(!error) {
            document.querySelector('.moontalk-error').style.display = 'none';
            return;
        }
        document.querySelector('.moontalk-error').style.display = 'block';
        document.querySelector('.moontalk-error-message').textContent = error;
    }

    async loadLatestComments() {
        if (!this.latestWidgetEl) return;

        const loadingEl = this.latestWidgetEl.querySelector('.moontalk-latest-loading');
        const emptyEl = this.latestWidgetEl.querySelector('.moontalk-latest-empty');
        const listEl = this.latestWidgetEl.querySelector('.moontalk-latest-list');

        loadingEl.style.display = 'block';
        emptyEl.style.display = 'none';
        listEl.innerHTML = '';

        try {
            const limit = parseInt(this.conf.latest_comments_limit, 10) || 5;
            const siteFilter = this.getLatestSiteFilter();
            const query = new URLSearchParams({ limit: String(limit) });
            if (siteFilter) {
                query.set('site', siteFilter);
            }

            const resp = await fetch(`${this.conf.server}/comments/latest?${query.toString()}`);
            if (!resp.ok) {
                throw new Error(`HTTP error - status: ${resp.status}`);
            }

            const comments = await resp.json();
            if (!Array.isArray(comments) || comments.length === 0) {
                emptyEl.style.display = 'block';
                return;
            }
            this.renderLatestComments(comments, listEl);
        } catch (err) {
            console.error('Failed to load latest comments:', err);
            emptyEl.style.display = 'block';
        } finally {
            loadingEl.style.display = 'none';
        }
    }

    getLatestSiteFilter() {
        if (this.conf.site_name && this.conf.site_name.trim()) {
            return this.conf.site_name.trim();
        }
        const pageKey = (this.conf.page_key || '').trim();
        if (!pageKey) return '';

        try {
            return new URL(pageKey).hostname;
        } catch (_) {
            const normalized = pageKey.replace(/^https?:\/\//i, '');
            return normalized.split('/')[0];
        }
    }

    renderLatestComments(comments, container) {
        const html = comments.map((comment) => {
            const date = new Date(comment.created_at).toLocaleString();
            const content = this.trimText(this.stripHtml(comment.content || ''), 120);
            const username = this.escapeHtml(comment.username || 'Anonymous');
            const post = this.escapeHtml(this.getPostLabel(comment.post_id));

            return `
                <div class="moontalk-latest-item">
                    <div class="moontalk-latest-item-header">
                        <span class="moontalk-latest-author">${username}</span>
                        <span class="moontalk-latest-date">${date}</span>
                    </div>
                    <div class="moontalk-latest-content">${this.escapeHtml(content)}</div>
                    <div class="moontalk-latest-post">${post}</div>
                </div>
            `;
        }).join('');
        container.innerHTML = html;
    }

    getPostLabel(postId) {
        if (!postId) return '';
        try {
            const parsed = new URL(postId);
            const path = parsed.pathname === '/' ? '' : parsed.pathname;
            return `${parsed.hostname}${path}`;
        } catch (_) {
            return this.trimText(postId, 60);
        }
    }

    stripHtml(value) {
        const tmp = document.createElement('div');
        tmp.innerHTML = value;
        return tmp.textContent || tmp.innerText || '';
    }

    escapeHtml(value) {
        const tmp = document.createElement('div');
        tmp.textContent = value;
        return tmp.innerHTML;
    }

    trimText(value, maxLength) {
        if (!value || value.length <= maxLength) return value;
        return `${value.slice(0, maxLength).trim()}...`;
    }

    renderRootComments(comments) {
        const container = document.querySelector('.moontalk-list');
        container.innerHTML = '';
        this.renderComments(comments, container, "moontalk-comment");
    }

    renderChildrenComments(comments, parentEl) {
        this.renderComments(comments, parentEl, "moontalk-subcomment");
    }

    renderComments(comments, container, classname) {
        comments.forEach(comment => {
            const commentEl = document.createElement('div');
            commentEl.classList.add(classname);
            commentEl.id = `moontalk-comment-${comment.id}`
            if(comment.hasChildren) {
                fetch(`${this.conf.server}/comments/list?postId=${this.conf.page_key}&parentId=${comment.id}`)
                .then(resp => {
                    if (!resp.ok) {
                        throw new Error(`HTTP error when fetching children comments: ${resp.status}`);
                    }
                    return resp.json();
                }).then(data => {
                    this.renderChildrenComments(data, commentEl);
                })
            }

            // Gravatar is great, but not great enough in some regions
            // let hash;
            // if(comment.email) {
            //     hash = md5(comment.email.trim().toLowerCase());
            // } else {
            //     hash = md5(comment.username.trim().toLowerCase());
            // }
            // const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?d=identicon`;
            const avatarUrl = `https://api.dicebear.com/9.x/glass/svg?seed=${comment.username}&size=40`
            const commentDate = new Date(comment.created_at).toLocaleString();
            if(comment.reply_to) {
                const replyToComment = comments.find(element => element.id == comment.reply_to);
                if (replyToComment) {
                    comment.content = `<strong>@${replyToComment.username}</strong> ${comment.content}`;
                }
            }
            const webiste = comment.website ? `<a href="${comment.website}" target="_blank">${comment.username}</a>` : comment.username;

            commentEl.innerHTML = `
                <div class="moontalk-comment-header">
                    <img class="moontalk-comment-avatar" src="${avatarUrl}" alt="Avatar">
                    <span class="moontalk-comment-username">${webiste}</span>
                    <span class="moontalk-comment-date">${commentDate}</span>
                </div>
                <div class="moontalk-comment-content">
                ${comment.content}
                    <div><button class="moontalk-comment-reply">reply</button></div>
                </div>
            `;
            container.appendChild(commentEl);
        });
        // Reply to a comment
        document.addEventListener('click', (e) => {
            if(e.target.classList.contains('moontalk-comment-reply')) {
                const outerEl =  e.target.parentNode.parentNode.parentNode;
                // Current replyed comment id
                const commentId = outerEl.id.split('-')[2];

                if(outerEl.classList.contains('moontalk-subcomment')) {
                    // Replying to a subcomment, find the parent comment
                    this.parent_id = outerEl.parentNode.id.split('-')[2];
                    this.reply_to = commentId; // Set the reply_to to the current comment id
                } else {
                    this.parent_id = commentId;
                }
                this.el.querySelector('.moontalk-editor').scrollIntoView({ behavior: 'smooth' });
                this.reply_to_username = `@${document.querySelector(`#moontalk-comment-${commentId} .moontalk-comment-username`).textContent} `
                this.el.querySelector('.moontalk-content').value = this.reply_to_username;
            }
        })
    }

    updatePaginationUI() {
        document.querySelector('.moontalk-paginator-info').textContent = `Page ${this.currentPage} of ${this.totalPages}`;
        document.querySelector('.moontalk-paginator-prev').disabled = this.currentPage <= 1;
        document.querySelector('.moontalk-paginator-next').disabled = this.currentPage >= this.totalPages;
    }

    goToPreviousPage() {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.loadComments();
          this.updatePaginationUI();
        }
    }

    goToNextPage() {
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.loadComments();
          this.updatePaginationUI();
        }
    }

    getDefaultOptions() {
        return {
            server: 'https://moontalk.net',
            page_Key: '',
            page_title: '',
            site_name: '',
            latest_comments_limit: 5,
            element: '#moontalk',
        };
    }
}

class DB {
    constructor() {

    }
}

// 全局单例模式
// Artalk.instance = null;
// Artalk.init = function(options) {
//   if (!Artalk.instance) {
//     Artalk.instance = new Artalk();
//   }
//   return Artalk.instance.init(options);
// };
