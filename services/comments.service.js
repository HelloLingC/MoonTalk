const { supabase } = require('../lib/supabase');
const { createHttpError } = require('../lib/http-error');
const { buildPaginationMeta } = require('../lib/pagination');

function assertNoError(error, code, message) {
    if (!error) return;
    throw createHttpError(500, code, message, error);
}

function normalizeCommentRecord(record) {
    return {
        id: record.id,
        postId: record.post_id,
        parentId: record.parent_id,
        replyTo: record.reply_to,
        username: record.username,
        email: record.email,
        website: record.website,
        content: String(record.content ?? ''),
        createdAt: record.created_at,
    };
}

async function assertCommentBelongsToPost(commentId, postId, fieldName) {
    const { data, error } = await supabase
        .from('Comment')
        .select('id,parent_id,post_id')
        .eq('id', commentId)
        .eq('post_id', postId)
        .limit(1);

    assertNoError(error, 'COMMENT_LOOKUP_FAILED', `Failed to validate ${fieldName}`);
    if (!data || data.length === 0) {
        throw createHttpError(400, 'VALIDATION_ERROR', `${fieldName} does not exist for this post`);
    }

    return data[0];
}

async function createComment({ postId, siteName, username, email, website, content, parentId, replyTo, ip, userAgent }) {
    let parent = null;
    let reply = null;

    if (parentId) {
        parent = await assertCommentBelongsToPost(parentId, postId, 'parent_id');
        if (parent.parent_id) {
            throw createHttpError(400, 'VALIDATION_ERROR', 'parent_id must reference a root comment');
        }
    }

    if (replyTo) {
        reply = await assertCommentBelongsToPost(replyTo, postId, 'reply_to');
        const replyBelongsToParent = reply.id === parentId || reply.parent_id === parentId;
        if (!replyBelongsToParent) {
            throw createHttpError(400, 'VALIDATION_ERROR', 'reply_to must belong to the same thread as parent_id');
        }
    }

    const payload = {
        post_id: postId,
        site_name: siteName,
        username,
        email,
        website,
        content,
        parent_id: parentId,
        reply_to: replyTo,
        ip,
        ua: userAgent,
    };

    const { data, error } = await supabase
        .from('Comment')
        .insert([payload])
        .select('*')
        .limit(1);

    assertNoError(error, 'COMMENT_CREATE_FAILED', 'Failed to create comment');

    return normalizeCommentRecord(data[0]);
}

async function listComments({ postId, page, limit }) {
    const offset = (page - 1) * limit;

    const [
        { count: totalCount, error: totalError },
        { count: rootCount, error: rootCountError },
        { data: rootRows, error: rootRowsError },
    ] = await Promise.all([
        supabase
            .from('Comment')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', postId)
            .eq('status', 'published'),
        supabase
            .from('Comment')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', postId)
            .eq('status', 'published')
            .is('parent_id', null),
        supabase
            .from('Comment')
            .select('*')
            .eq('post_id', postId)
            .eq('status', 'published')
            .is('parent_id', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1),
    ]);

    assertNoError(totalError, 'COMMENT_COUNT_FAILED', 'Failed to count comments');
    assertNoError(rootCountError, 'COMMENT_ROOT_COUNT_FAILED', 'Failed to count root comments');
    assertNoError(rootRowsError, 'COMMENT_LIST_FAILED', 'Failed to list comments');

    const roots = rootRows || [];
    const rootIds = roots.map((row) => row.id);

    let childrenRows = [];
    if (rootIds.length > 0) {
        const { data, error } = await supabase
            .from('Comment')
            .select('*')
            .eq('post_id', postId)
            .eq('status', 'published')
            .in('parent_id', rootIds)
            .order('created_at', { ascending: true });

        assertNoError(error, 'COMMENT_CHILDREN_LIST_FAILED', 'Failed to list child comments');
        childrenRows = data || [];
    }

    const childrenByParentId = new Map();
    for (const row of childrenRows) {
        const parentId = row.parent_id;
        if (!childrenByParentId.has(parentId)) {
            childrenByParentId.set(parentId, []);
        }
        childrenByParentId.get(parentId).push(normalizeCommentRecord(row));
    }

    const comments = roots.map((root) => {
        const normalizedRoot = normalizeCommentRecord(root);
        const children = childrenByParentId.get(root.id) || [];
        return {
            ...normalizedRoot,
            hasChildren: children.length > 0,
            children,
        };
    });

    const totalRoots = rootCount || 0;
    const totalComments = totalCount || 0;

    return {
        comments,
        meta: buildPaginationMeta(totalRoots, totalComments, page, limit),
    };
}

async function getLatestComments({ site, limit }) {
    let query = supabase
        .from('Comment')
        .select('id,username,content,created_at,post_id,site_name,website')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (site) {
        query = query.eq('site_name', site);
    }

    const { data, error } = await query;
    assertNoError(error, 'LATEST_COMMENT_LIST_FAILED', 'Failed to list latest comments');

    return (data || []).map((item) => ({
        id: item.id,
        username: item.username,
        content: String(item.content ?? ''),
        createdAt: item.created_at,
        postId: item.post_id,
        website: item.website,
    }));
}

module.exports = {
    createComment,
    listComments,
    getLatestComments,
};
