export function resolveElement(element) {
    if (typeof element === 'string') {
        return document.querySelector(element);
    }
    return element;
}

export function setVisible(element, visible) {
    if (!element) return;
    element.style.display = visible ? 'block' : 'none';
}

export function clearChildren(element) {
    if (!element) return;
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

export function createTextElement(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = text;
    return el;
}

export function formatDate(value) {
    return new Date(value).toLocaleString();
}

export function trimText(value, maxLength) {
    if (!value || value.length <= maxLength) return value;
    return `${value.slice(0, maxLength).trim()}...`;
}

export function getPostLabel(postId) {
    if (!postId) return '';
    try {
        const parsed = new URL(postId);
        const path = parsed.pathname === '/' ? '' : parsed.pathname;
        return `${parsed.hostname}${path}`;
    } catch (_) {
        return trimText(postId, 60);
    }
}

export function normalizeVoteState(vote) {
    const userVote = Number(vote?.userVote);
    return {
        upvotes: Number(vote?.upvotes) || 0,
        downvotes: Number(vote?.downvotes) || 0,
        score: Number(vote?.score) || 0,
        userVote: [-1, 0, 1].includes(userVote) ? userVote : 0,
    };
}
