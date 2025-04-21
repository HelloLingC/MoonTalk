const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.supabase_url, process.env.supabase_key);

const page_size = 10;

exports.createComment = async (req, res) => {
    try {
        const jsonO = req.body;
        console.log(jsonO.content)
        const { data, error } = await supabase
            .from('Comment')
            .insert([jsonO])
            .select('*');
      if (error) {
        throw error;
      }
      res.status(201).json(data[0]);
    } catch (err) {
        console.error('Error creating comment:', err);
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