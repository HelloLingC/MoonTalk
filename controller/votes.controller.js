const votesService = require('../services/votes.service');
const { ok } = require('../lib/response');
const { validateVoteInput } = require('../lib/validate');
const { getRequestIp } = require('../lib/request');

async function getPostVotes(ctx) {
    const postId = ctx.params.postId;
    const ip = getRequestIp(ctx);
    const data = await votesService.getVoteSummary(postId, ip);
    ok(ctx, data);
}

async function setPostVote(ctx) {
    const postId = ctx.params.postId;
    const { value } = validateVoteInput(postId, ctx.request.body?.value);
    const ip = getRequestIp(ctx);

    const data = await votesService.setVote({ postId, ip, value });
    ok(ctx, data);
}

module.exports = {
    getPostVotes,
    setPostVote,
};
