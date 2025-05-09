const express = require('express');
require('dotenv').config();
const path = require('path');
const comment = require('./controller/comments');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://moonlab.top');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    // Allow specific headers
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // Handle preflight requests (OPTIONS)
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});
app.use(express.json());

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const commentRouter = express.Router();
commentRouter.post('/create', async (req, res) => {
    await comment.createComment(req, res);
})
commentRouter.get('/num', async (req, res) => {
    await comment.getCommentsNumber(req, res);
})
commentRouter.get('/list', async (req, res) => {
    await comment.getAllComments(req, res);
})
commentRouter.get('/haschildren/:id', async (req, res) => {
    await comment.hasChildren(req, res);
})
app.use('/comments', commentRouter);

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;