const Koa = require('koa');
const Router = require('@koa/router');
const serve = require('koa-static');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
require('dotenv').config();
const path = require('path');
const send = require('koa-send');
const comment = require('./controller/comments');

const app = new Koa();
const router = new Router();

// CORS middleware
app.use(cors({
    origin: ['https://moonlab.top', 'http://lycois.org'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization']
}));

// Error handling middleware
app.use(async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        ctx.status = err.status || 500;
        ctx.body = { message: err.message };
        ctx.app.emit('error', err, ctx);
    }
});

// Body parser middleware
app.use(bodyParser());

// Static files
app.use(serve(path.join(__dirname, 'public')));

// Root route
router.get("/", async (ctx) => {
    await send(ctx, 'index.html', { root: __dirname });
});

// Comment routes
router.post('/comments/create', async (ctx) => {
    await comment.createComment(ctx);
});

router.get('/comments/num', async (ctx) => {
    await comment.getCommentsNumber(ctx);
});

router.get('/comments/list', async (ctx) => {
    await comment.getAllComments(ctx);
});

router.get('/comments/haschildren/:id', async (ctx) => {
    await comment.hasChildren(ctx);
});

app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ready on port ${PORT}.`));

module.exports = app;