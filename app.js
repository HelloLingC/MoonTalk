const express = require('express');
require('dotenv').config();
const cors = require('cors');
const path = require('path');
const comment = require('./controller/comments');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const corsOptions = {
    origin: process.env.host, // Allow only this origin
    methods: ['GET', 'POST'],
};

app.use(cors(corsOptions));
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