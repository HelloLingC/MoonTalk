class MoonTalk {
    constructor() {
        this.conf = {};
        this.currentPage = 0;
        this.totalPages = 0;
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
            this.el.querySelector('.moontalk-submit').addEventListener('click', ()=> {
                this.onSubmit(this);
            })
            this.el.querySelector('.moontalk-paginator-prev').addEventListener('click', () => {
                this.goToPreviousPage();
            })
            this.el.querySelector('.moontalk-paginator-next').addEventListener('click', () => {
                this.goToNextPage();
            })
            this.el_ok = true;
            this.loadComments();
        })
    }

    async onSubmit(self) {
        self.el.querySelector('.moontalk-submit').disabled = true;
        self.el.querySelector('.moontalk-submit').innerText = 'Submitting...';
        this.showError('');
        let content = self.el.querySelector('.moontalk-content').value;
        if(self.reply_to && content.startsWith(self.reply_to_username)) {
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
                reply_to: self.reply_to,
            }),
        }).then(resp => {
            if (!resp.ok) {
                return resp.json().then(errorData => {
                    throw new Error(errorData.message || 'Request failed');
                  });
            }
            this.onSucess();
        }).catch(err => {
            this.showError(err);
        }).finally(() => {
            this.el.querySelector('.moontalk-submit').disabled = false;
            this.el.querySelector('.moontalk-submit').innerText = 'Submit';
        })
    }

    async loadComments() {
        this.showLoading(true);
        if(this.currentPage == 0) {
            const resp = await fetch(`${this.conf.server}/comments/num?postId=${this.conf.page_key}`)
            if (!resp.ok) {
                throw new Error(`HTTP error - status: ${resp.status}`);
            }
            const data = await resp.json();
            this.totalPages = data.totalPages;
            document.querySelector('.moontalk-count').textContent = data.count;
            this.currentPage++;
            this.updatePaginationUI();
        }

        try {
            const resp = await fetch(`${this.conf.server}/comments/list?postId=${this.conf.page_key}&page=${this.currentPage}`)
            if (!resp.ok) {
                throw new Error(`HTTP error - status: ${resp.status}`);
            }
            const data = await resp.json();
            this.renderComments(data);
        } catch (err) {
            console.error(err);
            showError(err);
        } finally {
            this.showLoading(false);
        }
    }

    onSucess() {
        const successMsg = this.el.querySelector('.moontalk-comment-success');
        successMsg.style.display = 'flex';

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

    renderComments(comments) {
        const container = document.querySelector('.moontalk-list');
        container.innerHTML = '';
        comments.forEach(comment => {
            const commentEl = document.createElement('div');
            commentEl.classList.add('moontalk-comment');
            commentEl.id = `moontalk-comment-${comment.id}`
            if(comment.hasChildren) {
                fetch(`${this.conf.server}/comments/list?postId=${this.conf.page_key}&parentId=${comment.id}`)
                .then(resp => {
                    if (!resp.ok) {
                        throw new Error(`HTTP error when fetching children comments: ${resp.status}`);
                    }
                    return resp.json();
                }).then(data => {
                    this.renderChildrenComments(commentEl, data);
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
                const commentId = e.target.parentNode.parentNode.parentNode.id.split('-')[2];
                this.el.querySelector('.moontalk-editor').scrollIntoView({ behavior: 'smooth' });
                this.reply_to = commentId;
                this.reply_to_username = `@${document.querySelector(`#moontalk-comment-${commentId} .moontalk-comment-username`).textContent} `
                this.el.querySelector('.moontalk-content').value = this.reply_to_username;
            }
        })
    }

    renderChildrenComments(parent, comments) {
        comments.forEach(comment => {
            console.log(comment)
            const subComment = document.createElement('div');
            subComment.classList.add('moontalk-subcomments');


            const commentDate = new Date(comment.created_at).toLocaleString();
            const webiste = comment.website ? `<a href="${comment.website}" target="_blank">${comment.username}</a>` : comment.username;

            subComment.innerHTML = `
                <div class="moontalk-comment-header">
                    <img class="moontalk-comment-avatar" src="" alt="Avatar">
                    <span class="moontalk-comment-username">${webiste}</span>
                    <span class="moontalk-comment-date">${commentDate}</span>
                </div>
                <div class="moontalk-comment-content">
                    <span>Reply to @Lin</span>
                ${comment.content}
                    <div><button class="moontalk-comment-reply">reply</button></div>
                </div>
            `;
            parent.appendChild(subComment);
        });
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

    loadStyles() {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://.css';
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link); // Insert to <head>
          });
    }

    getDefaultOptions() {
        return {
            server: 'https://moontalk.net',
            page_Key: '',
            page_title: '',
            site_name: '',
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

