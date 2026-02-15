const test = require('node:test');
const assert = require('node:assert/strict');

const {
    validateCreateCommentInput,
    validateListCommentsInput,
    validateVoteInput,
} = require('../../lib/validate');

test('validateCreateCommentInput accepts valid payload', () => {
    const result = validateCreateCommentInput('post-1', {
        username: 'alice',
        content: 'hello world',
        email: 'alice@example.com',
        website: 'https://example.com',
        parent_id: '12',
        reply_to: '14',
    });

    assert.equal(result.postId, 'post-1');
    assert.equal(result.username, 'alice');
    assert.equal(result.parentId, 12);
    assert.equal(result.replyTo, 14);
});

test('validateCreateCommentInput rejects reply_to without parent_id', () => {
    assert.throws(
        () => validateCreateCommentInput('post-1', {
            username: 'alice',
            content: 'hello world',
            reply_to: '14',
        }),
        (error) => {
            assert.equal(error.status, 400);
            assert.equal(error.code, 'VALIDATION_ERROR');
            return true;
        },
    );
});

test('validateListCommentsInput validates page and limit', () => {
    const result = validateListCommentsInput('post-1', '2', '10');
    assert.deepEqual(result, {
        postId: 'post-1',
        page: 2,
        limit: 10,
    });

    assert.throws(() => validateListCommentsInput('post-1', '-1', '10'));
    assert.throws(() => validateListCommentsInput('post-1', '1', '100'));
});

test('validateVoteInput supports -1 0 1 only', () => {
    assert.deepEqual(validateVoteInput('post-1', -1), { postId: 'post-1', value: -1 });
    assert.deepEqual(validateVoteInput('post-1', 0), { postId: 'post-1', value: 0 });
    assert.deepEqual(validateVoteInput('post-1', 1), { postId: 'post-1', value: 1 });
    assert.throws(() => validateVoteInput('post-1', 2));
});
