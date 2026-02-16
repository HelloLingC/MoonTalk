const Koa = require('koa');
const Router = require('@koa/router');
const serve = require('koa-static');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
require('dotenv').config();
const path = require('path');
const send = require('koa-send');

const commentsController = require('./controller/comments.controller');
const votesController = require('./controller/votes.controller');
const { HttpError } = require('./lib/http-error');

const app = new Koa();
const router = new Router();

const rootPath = process.env.VERCEL ? process.cwd() : __dirname;

const allowedOrigins = [
    'https://moonlab.top',
    'https://lycois.org',
    'http://localhost:3000',
];

app.use(cors({
    origin: (ctx) => {
        if (allowedOrigins.includes(ctx.request.headers.origin)) {
            return ctx.request.headers.origin;
        }
        return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
}));

app.use(async (ctx, next) => {
    try {
        await next();

        if (ctx.status === 404 && !ctx.body) {
            ctx.status = 404;
            ctx.body = {
                error: {
                    code: 'NOT_FOUND',
                    message: 'Resource not found',
                },
            };
        }
    } catch (err) {
        if (err instanceof HttpError) {
            ctx.status = err.status;
            ctx.body = {
                error: {
                    code: err.code,
                    message: err.message,
                    details: err.details,
                },
            };
            return;
        }

        console.error('Unhandled error:', err);
        ctx.status = err.status || 500;
        ctx.body = {
            error: {
                code: 'INTERNAL_ERROR',
                message: err.message || 'Unexpected server error',
            },
        };
    }
});

app.use(bodyParser());
app.use(serve(path.join(rootPath, 'public')));

router.get('/', async (ctx) => {
    await send(ctx, 'index.html', { root: rootPath });
});

router.post('/api/v2/posts/:postId/comments', commentsController.createPostComment);
router.get('/api/v2/posts/:postId/comments', commentsController.getPostComments);
router.get('/api/v2/comments/latest', commentsController.getLatestComments);
router.get('/rss/comments.xml', commentsController.getLatestCommentsRss);

router.get('/api/v2/posts/:postId/votes', votesController.getPostVotes);
router.put('/api/v2/posts/:postId/vote', votesController.setPostVote);

app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ready on port ${PORT}.`));

module.exports = app;
