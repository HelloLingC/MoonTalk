function ok(ctx, data, meta, status = 200) {
    ctx.status = status;
    ctx.body = meta ? { data, meta } : { data };
}

module.exports = {
    ok,
};
