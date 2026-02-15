function getRequestIp(ctx) {
    return ctx.request.headers['x-forwarded-for']?.split(',')[0].trim() || ctx.request.ip;
}

module.exports = {
    getRequestIp,
};
