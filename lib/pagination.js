function buildPaginationMeta(totalRoots, totalComments, page, limit) {
    return {
        page,
        limit,
        totalPages: Math.ceil(totalRoots / limit),
        totalRoots,
        totalComments,
    };
}

module.exports = {
    buildPaginationMeta,
};
