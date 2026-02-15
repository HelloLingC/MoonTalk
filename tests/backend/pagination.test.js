const test = require('node:test');
const assert = require('node:assert/strict');

const { buildPaginationMeta } = require('../../lib/pagination');

test('buildPaginationMeta computes total pages correctly', () => {
    const meta = buildPaginationMeta(21, 30, 1, 10);

    assert.equal(meta.totalPages, 3);
    assert.equal(meta.totalRoots, 21);
    assert.equal(meta.totalComments, 30);
    assert.equal(meta.page, 1);
    assert.equal(meta.limit, 10);
});

test('buildPaginationMeta handles empty result set', () => {
    const meta = buildPaginationMeta(0, 0, 1, 10);
    assert.equal(meta.totalPages, 0);
});
