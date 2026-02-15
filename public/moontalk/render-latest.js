import { clearChildren, createTextElement, formatDate, getPostLabel, trimText } from './dom.js';

export function renderLatestComments(listEl, comments) {
    clearChildren(listEl);

    for (const comment of comments) {
        const item = document.createElement('div');
        item.className = 'moontalk-latest-item';

        const header = document.createElement('div');
        header.className = 'moontalk-latest-item-header';

        header.appendChild(createTextElement('span', 'moontalk-latest-author', comment.username || 'Anonymous'));
        header.appendChild(createTextElement('span', 'moontalk-latest-date', formatDate(comment.createdAt)));

        const content = createTextElement('div', 'moontalk-latest-content', trimText(comment.content || '', 120));
        const post = createTextElement('div', 'moontalk-latest-post', getPostLabel(comment.postId));

        item.appendChild(header);
        item.appendChild(content);
        item.appendChild(post);

        listEl.appendChild(item);
    }
}
