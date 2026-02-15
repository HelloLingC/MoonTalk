const { createClient } = require('@supabase/supabase-js');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const supabase = createClient(process.env.supabase_url, process.env.supabase_key);

const page_size = 10;

function getRequestIp(ctx) {
    return ctx.request.headers['x-forwarded-for']?.split(',')[0].trim() || ctx.request.ip;
}

async function getVoteSummary(postId, ip) {
    const { data, error } = await supabase
        .from('Vote')
        .select('value,ip')
        .eq('post_id', postId);

    if (error) throw error;

    let upvotes = 0;
    let downvotes = 0;
    let userVote = 0;

    for (const vote of data || []) {
        if (vote.value === 1) upvotes += 1;
        if (vote.value === -1) downvotes += 1;
        if (ip && vote.ip === ip) userVote = vote.value;
    }

    return {
        upvotes,
        downvotes,
        score: upvotes - downvotes,
        userVote,
    };
}

function validateComment(c) {
    const errors = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (c.username) {
        if(c.username.length < 3) {
            errors.push('Username must be at least 3 characters long');
        }
        if(c.username.length > 15) {
            errors.push('Username must be at most 20 characters long');
        }
    } else {
        errors.push('Name is required');
    }
    if (c.email) {
        if(!emailRegex.test(c.email)) {
            errors.push('Invalid email address');
        }
        if (c.email.length > 20) {
            errors.push('Email must be at most 20 characters long');
        }
    }
    if (c.website) {
        if (c.website.length > 40) {
            errors.push('Website URL must be at most 40 characters long');
        }
        if (!urlRegex.test(c.website)) {
            errors.push('Invalid website URL');
        }
    }
    if (c.content) {
        if (c.content.length < 5) {
            errors.push('Comment content must be at least 5 characters long');
        }
        if (c.content.length > 1000) {
            errors.push('Comment content must be at most 1000 characters long');
        }
    } else {
        errors.push('Comment content is required');
    }
    if(c.reply_to && isNaN(c.reply_to)) {
        errors.push('Invalid reply_to');
    }
    if(c.parent_id && isNaN(c.parent_id)) {
        errors.push('Invalid parent_id');
    }
    if(c.reply_to && !c.parent_id) {
        errors.push('reply_to requires parent_id');
    }
    if(c.post_id) {
        if (c.post_id.length > 1000) {
            errors.push('post_id too large');
        }
    } else {
        errors.push('Post ID is required');
    }
    return { ok: errors.length == 0, errors };
}

exports.createComment = async (ctx) => {
    try {
        const ip = getRequestIp(ctx);
        const jsonO = ctx.request.body;

        const window = new JSDOM('').window;
        const DOMPurify = createDOMPurify(window);
        const no_html = {
            ALLOWED_TAGS: [], // No tags are allowed
            ALLOWED_ATTR: [], // No attributes allowed
            KEEP_CONTENT: true // Keep text content but remove all tags
          }
        jsonO.content = DOMPurify.sanitize(jsonO.content, {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'code'],
            ALLOWED_ATTR: ['href', 'title']
          });
        jsonO.username = DOMPurify.sanitize(jsonO.username, no_html);
        jsonO.email = DOMPurify.sanitize(jsonO.email, no_html);
        jsonO.website = DOMPurify.sanitize(jsonO.website, no_html);

        jsonO.ip = ip;
        jsonO.ua = ctx.get('User-Agent');
        const {ok, errors} = validateComment(jsonO);
        if (!ok) {
            throw new Error('Invaild comment: ' + errors.join(', '));
        }
        const { data, error } = await supabase
            .from('Comment')
            .insert([jsonO])
            .select('*');
      if (error) {
        throw error;
      }
      ctx.status = 201;
      ctx.body = data[0];
    } catch (err) {
        ctx.status = 500;
        ctx.body = { message: err.message };
    }
}


exports.getPostVotes = async (ctx) => {
    try {
        const postId = ctx.query.postId;
        if (!postId) {
            ctx.status = 400;
            ctx.body = { message: 'Post ID is required' };
            return;
        }

        const ip = getRequestIp(ctx);
        const summary = await getVoteSummary(postId, ip);
        ctx.status = 200;
        ctx.body = summary;
    } catch (err) {
        console.error('Error querying votes:', err);
        ctx.status = 500;
        ctx.body = { message: err.message };
    }
}

exports.submitPostVote = async (ctx) => {
    try {
        const postId = String(ctx.request.body?.post_id || '').trim();
        const value = Number(ctx.request.body?.value);
        const ip = getRequestIp(ctx);

        if (!postId) {
            ctx.status = 400;
            ctx.body = { message: 'Post ID is required' };
            return;
        }

        if (![-1, 0, 1].includes(value)) {
            ctx.status = 400;
            ctx.body = { message: 'Vote value must be -1, 0, or 1' };
            return;
        }

        if (value === 0) {
            const { error } = await supabase
                .from('Vote')
                .delete()
                .eq('post_id', postId)
                .eq('ip', ip);
            if (error) throw error;
        } else {
            const { data: existingVotes, error: findError } = await supabase
                .from('Vote')
                .select('post_id')
                .eq('post_id', postId)
                .eq('ip', ip)
                .limit(1);
            if (findError) throw findError;

            if (existingVotes && existingVotes.length > 0) {
                const { error: updateError } = await supabase
                    .from('Vote')
                    .update({ value })
                    .eq('post_id', postId)
                    .eq('ip', ip);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('Vote')
                    .insert([{ post_id: postId, value, ip }]);
                if (insertError) throw insertError;
            }
        }

        const summary = await getVoteSummary(postId, ip);
        ctx.status = 200;
        ctx.body = summary;
    } catch (err) {
        console.error('Error submitting vote:', err);
        ctx.status = 500;
        ctx.body = { message: err.message };
    }
}


/**
 * Get total comments number of a post
 * used for pagination
 */
exports.getCommentsNumber = async (ctx) => {
    const postId = ctx.query.postId;
    if(!postId) {
        ctx.status = 500;
        ctx.body = { message: 'Post ID is required' };
        return;
    }
    const [
        { count: totalCount, error: countError },
        { count: parentCount, error: parentCountError }
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
            .is('parent_id', null)
    ]);

    if (countError || parentCountError) {
        ctx.status = 500;
        ctx.body = { message: 'Cannot get comments number: ' +
             JSON.stringify((countError || parentCountError))};
        return;
    }

    ctx.status = 200;
    ctx.body = {
        count: totalCount,
        totalPages: Math.ceil(parentCount / page_size),
    };
}

exports.getAllComments = async (ctx) => {
    try {
        const postId = ctx.query.postId;
        const parentId = ctx.query.parentId;
        const page = parseInt(ctx.query.page) || 1;
        const limit = parseInt(ctx.query.limit) || page_size;
        const skip = (page - 1) * limit;

        let query = supabase.from('Comment')
        .select('*')
        .eq('post_id', postId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range(skip, skip + limit);

        if (parentId) {
            query = query.eq('parent_id', parentId);
        } else {
            query = query.is('parent_id', null);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (data.length === 0) {
            ctx.status = 200;
            ctx.body = { message: 'No comments found' };
            return;
        }

        const commentsWithChildren = await Promise.all(
            data.map(async comment => {
                const { data: hasChildren } = await supabase
                    .rpc('comment_has_children', { comment_id: comment.id });
                return {
                    ...comment,
                    hasChildren
                };
            })
        );
        ctx.body = commentsWithChildren;
    } catch (err) {
        console.error('Error querying comments:', err);
        ctx.status = 500;
        ctx.body = { message: err.message };
    }
  };

exports.getLatestComments = async (ctx) => {
    try {
        const site = (ctx.query.site || '').trim();
        const limit = Math.min(Math.max(parseInt(ctx.query.limit, 10) || 5, 1), 20);

        let query = supabase.from('Comment')
            .select('id,username,content,created_at,post_id,website')
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (site) {
            query = query.ilike('post_id', `%${site}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        ctx.status = 200;
        ctx.body = data || [];
    } catch (err) {
        console.error('Error querying latest comments:', err);
        ctx.status = 500;
        ctx.body = { message: err.message };
    }
}


/**
 * whether a comment has children comment (reply_to)
 * rely on supabase's database functions
 * SELECT EXISTS (SELECT 1 FROM comments WHERE parent_id = comment_id);
$$ LANGUAGE sql;
 * @param {*} ctx - Koa context object
 */
exports.hasChildren = async (ctx) => {
    try {
        // /comments/haschildren/:id or ?id=123
        const id = ctx.params.id || ctx.query.id;
        if(!id) throw new Error('Comment ID is required');

        const { data, error } = await supabase
        .rpc('comment_has_children', { comment_id: id});
        if(error) throw error;
        ctx.body = data; // return bool value
    } catch (err) {
        console.error('Error querying comments:', err);
        ctx.status = 500;
        ctx.body = { message: err.message };
    }
}
