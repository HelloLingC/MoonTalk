
class MoonTalk {
    constructor() {
        this.conf = {};
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
    }

    initEl() {
        const container = typeof this.conf.element === 'string'
        ? document.querySelector(this.conf.element) : this.conf.element;
        if(!container) throw new Error(`Element "${this.conf.el}" not found`);
        console.log(container)
        this.el = container;
        this.el.innerHTML = '';

        const xhr = new XMLHttpRequest();
        const url = this.conf.server + '/header.html';
        console.log("" + url);
        xhr.open('GET', url, true);
        xhr.onload = () => {
            if (xhr.status === 200) {
                this.el.innerHTML = xhr.responseText;
                document.querySelector('.moontalk-submit').addEventListener('click', ()=> {
                    this.onSubmit(this);
                })
            } else {
                throw new Error('Failed to load header.html');
            }
        };
        xhr.send();
    }

    onSubmit(self) {
        console.log('Submit!!');
        self.el.querySelector('.moontalk-submit').disabled = true;
        self.el.querySelector('.moontalk-submit').innerText = 'Submitting...';
        const xhr = new XMLHttpRequest();
        
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