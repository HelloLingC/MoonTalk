function escapeXml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function toHttpUrl(value) {
    const text = String(value ?? '').trim();
    if (!text) return null;

    try {
        const parsed = new URL(text);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return null;
        }
        return parsed.toString();
    } catch (_) {
        return null;
    }
}

function formatPubDate(value) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return new Date().toUTCString();
    }
    return parsed.toUTCString();
}

function resolveItemLink(comment, fallbackLink) {
    return toHttpUrl(comment.website) || toHttpUrl(comment.postId) || `${fallbackLink}#comment-${comment.id || 'unknown'}`;
}

function buildCommentsRss({ feedUrl, site, comments }) {
    const normalizedFeedUrl = toHttpUrl(feedUrl) || 'https://comment.moonlab.top/rss/comments.xml';
    const normalizedSite = String(site ?? '').trim();
    const title = normalizedSite
        ? `MoonTalk Comments - ${normalizedSite}`
        : 'MoonTalk Comments';
    const description = normalizedSite
        ? `Latest comments for ${normalizedSite}`
        : 'Latest comments from MoonTalk';

    const itemsXml = (comments || []).map((comment) => {
        const username = String(comment.username || 'Anonymous').trim() || 'Anonymous';
        const itemTitle = `Comment by ${username}`;
        const itemLink = resolveItemLink(comment, normalizedFeedUrl);
        const guid = `moontalk:${String(comment.postId || 'unknown')}:${String(comment.id || 'unknown')}`;

        return [
            '<item>',
            `<title>${escapeXml(itemTitle)}</title>`,
            `<description>${escapeXml(String(comment.content || ''))}</description>`,
            `<link>${escapeXml(itemLink)}</link>`,
            `<guid isPermaLink="false">${escapeXml(guid)}</guid>`,
            `<pubDate>${escapeXml(formatPubDate(comment.createdAt))}</pubDate>`,
            '</item>',
        ].join('');
    }).join('');

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0">',
        '<channel>',
        `<title>${escapeXml(title)}</title>`,
        `<description>${escapeXml(description)}</description>`,
        `<link>${escapeXml(normalizedFeedUrl)}</link>`,
        `<lastBuildDate>${escapeXml(new Date().toUTCString())}</lastBuildDate>`,
        itemsXml,
        '</channel>',
        '</rss>',
    ].join('');
}

module.exports = {
    buildCommentsRss,
    escapeXml,
};
