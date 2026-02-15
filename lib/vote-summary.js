function buildVoteSummary(upvotes, downvotes, userVote) {
    const up = upvotes || 0;
    const down = downvotes || 0;
    return {
        upvotes: up,
        downvotes: down,
        score: up - down,
        userVote: userVote || 0,
    };
}

module.exports = {
    buildVoteSummary,
};
