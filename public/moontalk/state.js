export function createInitialState(pageSize) {
    return {
        comments: {
            currentPage: 1,
            totalPages: 0,
            totalComments: 0,
            pageSize,
        },
        reply: {
            parentId: null,
            replyTo: null,
            mention: '',
        },
        vote: {
            upvotes: 0,
            downvotes: 0,
            score: 0,
            userVote: 0,
            loading: false,
        },
    };
}
