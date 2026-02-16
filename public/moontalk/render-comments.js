import { clearChildren, createTextElement, formatDate } from './dom.js';

function createUsernameElement(comment) {
    if (comment.website) {
        const link = document.createElement('a');
        link.href = comment.website;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = comment.username;
        return link;
    }

    const span = document.createElement('span');
    span.textContent = comment.username;
    return span;
}

function createReplyButton(comment, parentId) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'moontalk-comment-reply';
    button.dataset.action = 'reply';
    button.dataset.commentId = String(comment.id);
    button.dataset.parentId = String(parentId);
    button.dataset.username = comment.username;
    button.textContent = 'reply';
    return button;
}

function createContentElement(comment, idToUsername) {
    const wrapper = document.createElement('div');
    wrapper.className = 'moontalk-comment-content';

    const text = document.createElement('p');
    text.className = 'moontalk-comment-text';

    if (comment.replyTo && idToUsername.has(comment.replyTo)) {
        text.appendChild(createTextElement('strong', 'moontalk-mention', `@${idToUsername.get(comment.replyTo)} `));
    }

    text.appendChild(document.createTextNode(comment.content || ''));

    wrapper.appendChild(text);

    const actionRow = document.createElement('div');
    actionRow.appendChild(createReplyButton(comment, comment.parentId || comment.id));
    wrapper.appendChild(actionRow);

    return wrapper;
}

function createCommentElement(comment, idToUsername, className) {
    const outer = document.createElement('article');
    outer.className = className;
    outer.id = `moontalk-comment-${comment.id}`;

    const header = document.createElement('div');
    header.className = 'moontalk-comment-header';

    const avatar = document.createElement('img');
    avatar.className = 'moontalk-comment-avatar';
    avatar.alt = 'Avatar';
    avatar.loading = 'lazy';
    avatar.src = `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(comment.username || 'anonymous')}&size=40`;

    const username = document.createElement('span');
    username.className = 'moontalk-comment-username';
    username.appendChild(createUsernameElement(comment));

    const date = createTextElement('span', 'moontalk-comment-date', formatDate(comment.createdAt));

    header.appendChild(avatar);
    header.appendChild(username);
    header.appendChild(date);

    outer.appendChild(header);
    outer.appendChild(createContentElement(comment, idToUsername));

    return outer;
}

export function renderComments(listEl, comments) {
    clearChildren(listEl);

    const idToUsername = new Map();
    for (const comment of comments) {
        idToUsername.set(comment.id, comment.username);
        for (const child of comment.children || []) {
            idToUsername.set(child.id, child.username);
        }
    }

    for (const root of comments) {
        const rootElement = createCommentElement(root, idToUsername, 'moontalk-comment');

        for (const child of root.children || []) {
            const childElement = createCommentElement(child, idToUsername, 'moontalk-subcomment');
            rootElement.appendChild(childElement);
        }

        listEl.appendChild(rootElement);
    }
}
