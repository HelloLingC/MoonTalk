const { createClient } = require('@supabase/supabase-js');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const supabase = createClient(process.env.supabase_url, process.env.supabase_key);

const page_size = 10;

function validateComment(c) {
    const errors = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (c.usernname) {
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
    return { ok: errors.length == 0, errors };
}

exports.createComment = async (req, res) => {
    try {
        const ip = req.ip;
        const jsonO = req.body;

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
        jsonO.ua = req.get('User-Agent');
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
      res.status(201).json(data[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/**
 * Get total comments number of a post
 * used for pagination
 */
exports.getCommentsNumber = async (req, res) => {
    try{
        const postId = req.query.postId;
        if (!postId) {
            res.status(400).send('Post ID is required');
            return;
        }
        const { data, error, count } = await supabase.from('Comment')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
        if (error) throw error;
        res.json({ count: count, totalPages: Math.ceil(count / page_size) });
    } catch(err) {
        console.error('Error querying comments:', err);
        res.status(500).json({ message: err.message });
    }
}

exports.getAllComments = async (req, res) => {
    try {
        const postId = req.query.postId;
        const parentId = req.query.parentId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || page_size;
        const skip = (page - 1) * limit;

        let query = supabase.from('Comment')
        .select('*')
        .eq('post_id', postId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range(skip, skip + limit);

        if (parentId) {
            query = query.eq('reply_to', parentId);
        } else {
            query = query.is('reply_to', null);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (data.length === 0) {
            res.status(200).json({ message: 'No comments found' });
            return;
        }
        res.json(data);
    } catch (err) {
        console.error('Error querying comments:', err);
        res.status(500).json({ message: err.message });
    }
  };