const commentsService = require('../services/comments.service');
const { ok } = require('../lib/response');
const {
    validateCreateCommentInput,
    validateListCommentsInput,
    validateLatestCommentsInput,
} = require('../lib/validate');
const { getRequestIp } = require('../lib/request');
const { buildCommentsRss } = require('../lib/rss');

async function createPostComment(ctx) {
    const postId = ctx.params.postId;
    const validated = validateCreateCommentInput(postId, ctx.request.body || {});

    const data = await commentsService.createComment({
        postId: validated.postId,
        siteName: validated.siteName,
        username: validated.username,
        email: validated.email,
        website: validated.website,
        content: validated.content,
        parentId: validated.parentId,
        replyTo: validated.replyTo,
        ip: getRequestIp(ctx),
        userAgent: ctx.get('User-Agent'),
    });

    ok(ctx, data, null, 201);
}

async function getPostComments(ctx) {
    const postId = ctx.params.postId;
    const { page, limit } = validateListCommentsInput(postId, ctx.query.page, ctx.query.limit);

    const result = await commentsService.listComments({ postId, page, limit });
    ok(ctx, result.comments, result.meta);
}

async function getLatestComments(ctx) {
    const { site, limit } = validateLatestCommentsInput(ctx.query.site, ctx.query.limit);
    const data = await commentsService.getLatestComments({ site, limit });
    ok(ctx, data);
}

async function getLatestCommentsRss(ctx) {
    const { site, limit } = validateLatestCommentsInput(ctx.query.site, ctx.query.limit);
    const comments = await commentsService.getLatestComments({ site, limit });

    const query = new URLSearchParams();
    if (site) query.set('site', site);
    query.set('limit', String(limit));

    const queryString = query.toString();
    const feedUrl = `${ctx.origin}${ctx.path}${queryString ? `?${queryString}` : ''}`;

    ctx.status = 200;
    ctx.type = 'application/rss+xml; charset=utf-8';
    ctx.body = buildCommentsRss({
        feedUrl,
        site,
        comments,
    });
}

module.exports = {
    createPostComment,
    getPostComments,
    getLatestComments,
    getLatestCommentsRss,
};
