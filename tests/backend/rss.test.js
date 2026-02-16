const test = require('node:test');
const assert = require('node:assert/strict');

const { buildCommentsRss } = require('../../lib/rss');

test('buildCommentsRss renders RSS XML and escapes item fields', () => {
    const xml = buildCommentsRss({
        feedUrl: 'https://comment.moonlab.top/rss/comments.xml?site=example.com&limit=2',
        site: 'example.com',
        comments: [
            {
                id: 123,
                username: 'alice & bob',
                content: 'hello <world>',
                createdAt: '2026-01-01T00:00:00.000Z',
                postId: 'https://example.com/post-1',
                website: '',
            },
        ],
    });

    assert.match(xml, /<rss version="2.0">/);
    assert.match(xml, /<title>MoonTalk Comments - example\.com<\/title>/);
    assert.match(xml, /Comment by alice &amp; bob/);
    assert.match(xml, /hello &lt;world&gt;/);
    assert.match(xml, /<link>https:\/\/example\.com\/post-1<\/link>/);
    assert.match(xml, /<guid isPermaLink="false">moontalk:https:\/\/example\.com\/post-1:123<\/guid>/);
});

test('buildCommentsRss falls back to feed URL fragment when comment link is not a URL', () => {
    const xml = buildCommentsRss({
        feedUrl: 'https://comment.moonlab.top/rss/comments.xml',
        site: '',
        comments: [
            {
                id: 7,
                username: 'anonymous',
                content: 'plain text',
                createdAt: 'not-a-date',
                postId: 'local-post-key',
                website: null,
            },
        ],
    });

    assert.match(xml, /<link>https:\/\/comment\.moonlab\.top\/rss\/comments\.xml#comment-7<\/link>/);
    assert.match(xml, /<pubDate>.*GMT<\/pubDate>/);
});
