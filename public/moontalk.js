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
            document.querySelector('.moontalk-submit').addEventListener('click', ()=> {
                this.onSubmit(this);
            })
            this.el_ok = true;
            this.loadComments();
        })
    }

    async onSubmit(self) {
        self.el.querySelector('.moontalk-submit').disabled = true;
        self.el.querySelector('.moontalk-submit').innerText = 'Submitting...';
        const resp = await fetch(self.conf.server + "/comments/create", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: self.el.querySelector('.moontalk-content').value,
                post_id: self.conf.page_key,
                username: self.el.querySelector('.moontalk-name').value,
                email: self.el.querySelector('.moontalk-email').value,
            }),
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
        } finally {
            this.showLoading(false);
        }
    }

    showLoading(show) {
        document.querySelector('.moontalk-loading').style.display = show ? 'block' : 'none';
    }

    renderComments(comments) {
        const container = document.querySelector('.moontalk-list');
        container.innerHTML = '';
        comments.forEach(comment => {
            const commentEl = document.createElement('div');
            commentEl.classList.add('moontalk-comment');

            let hash;
            if(comment.email) {
                hash = md5(comment.email.trim().toLowerCase());
            } else {
                hash = md5(comment.username.trim().toLowerCase());
            }
            const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?d=identicon`;
            const commentDate = new Date(comment.created_at).toLocaleString();

            commentEl.innerHTML = `
                <div class="moontalk-comment-header">
                    <img class="moontalk-comment-avatar" src="${gravatarUrl}" alt="Avatar">
                    <span class="moontalk-comment-username">${comment.username}</span>
                    <span class="moontalk-comment-date">${commentDate}</span>
                </div>
                <div class="moontalk-comment-content">${comment.content}</div>
            `;
            container.appendChild(commentEl);
        });
    }

    updatePaginationUI() {
        document.querySelector('.moontalk-paginator-info').textContent = `Page ${this.currentPage} of ${this.totalPages}`;
        document.querySelector('.moontalk-paginator-prev').disabled = this.currentPage <= 1;
        document.querySelector('.moontalk-paginator-next').disabled = this.currentPage >= this.totalPages;
    }

    goToPreviousPage() {
        if (currentPage > 1) {
          currentPage--;
          this.loadComments();
        }
    }

    goToNextPage() {
        if (currentPage < totalPages) {
          currentPage++;
          this.loadComments();
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

