const test = require('node:test');
const assert = require('node:assert/strict');

const { buildVoteSummary } = require('../../lib/vote-summary');

test('buildVoteSummary computes score and defaults', () => {
    const summary = buildVoteSummary(7, 2, 1);

    assert.deepEqual(summary, {
        upvotes: 7,
        downvotes: 2,
        score: 5,
        userVote: 1,
    });
});

test('buildVoteSummary normalizes nullish values', () => {
    const summary = buildVoteSummary(null, undefined, 0);

    assert.deepEqual(summary, {
        upvotes: 0,
        downvotes: 0,
        score: 0,
        userVote: 0,
    });
});
