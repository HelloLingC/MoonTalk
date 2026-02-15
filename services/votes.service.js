const { supabase } = require('../lib/supabase');
const { createHttpError } = require('../lib/http-error');
const { buildVoteSummary } = require('../lib/vote-summary');

function assertNoError(error, code, message) {
    if (!error) return;
    throw createHttpError(500, code, message, error);
}

async function getVoteSummary(postId, ip) {
    const [
        { count: upvotes, error: upvoteError },
        { count: downvotes, error: downvoteError },
        { data: userVoteRows, error: userVoteError },
    ] = await Promise.all([
        supabase
            .from('Vote')
            .select('post_id', { count: 'exact', head: true })
            .eq('post_id', postId)
            .eq('value', 1),
        supabase
            .from('Vote')
            .select('post_id', { count: 'exact', head: true })
            .eq('post_id', postId)
            .eq('value', -1),
        supabase
            .from('Vote')
            .select('value')
            .eq('post_id', postId)
            .eq('ip', ip)
            .limit(1),
    ]);

    assertNoError(upvoteError, 'VOTE_COUNT_UP_FAILED', 'Failed to count upvotes');
    assertNoError(downvoteError, 'VOTE_COUNT_DOWN_FAILED', 'Failed to count downvotes');
    assertNoError(userVoteError, 'VOTE_READ_USER_FAILED', 'Failed to read current user vote');

    const userVote = userVoteRows?.[0]?.value ?? 0;
    return buildVoteSummary(upvotes, downvotes, userVote);
}

async function setVote({ postId, ip, value }) {
    if (value === 0) {
        const { error } = await supabase
            .from('Vote')
            .delete()
            .eq('post_id', postId)
            .eq('ip', ip);
        assertNoError(error, 'VOTE_DELETE_FAILED', 'Failed to remove vote');
    } else {
        const { error } = await supabase
            .from('Vote')
            .upsert([{ post_id: postId, ip, value }], {
                onConflict: 'post_id,ip',
            });

        assertNoError(error, 'VOTE_UPSERT_FAILED', 'Failed to save vote');
    }

    return getVoteSummary(postId, ip);
}

module.exports = {
    getVoteSummary,
    setVote,
};
