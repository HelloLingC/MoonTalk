# MoonTalk

A modular comment widget with voting for static or dynamic websites.

## Quick Start

```html
<div id="moontalk-container"></div>
<script type="module">
  import MoonTalk from 'https://comment.moonlab.top/moontalk.js';

  const widget = new MoonTalk({
    server: 'https://comment.moonlab.top',
    postId: 'my-post-key',
    element: '#moontalk-container',
    siteName: 'example.com',
    latestCommentsLimit: 5,
  });

  widget.mount();
</script>
```

## Frontend API

Create and mount widget:

```js
const widget = new MoonTalk({
  server: 'https://comment.moonlab.top',
  postId: 'my-post-key',
  element: '#moontalk-container',
  siteName: 'example.com',
  latestCommentsLimit: 5,
  pageSize: 10,
});

await widget.mount();
```

## Backend API (v2)

### Create comment
- `POST /api/v2/posts/:postId/comments`
- Body:

```json
{
  "username": "alice",
  "content": "hello world",
  "email": "alice@example.com",
  "website": "https://example.com",
  "parent_id": 1,
  "reply_to": 2
}
```

### List comments
- `GET /api/v2/posts/:postId/comments?page=1&limit=10`
- Response envelope:

```json
{
  "data": [
    {
      "id": 1,
      "postId": "my-post-key",
      "parentId": null,
      "replyTo": null,
      "username": "alice",
      "content": "hello",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "hasChildren": true,
      "children": []
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "totalRoots": 1,
    "totalComments": 1
  }
}
```

### Latest comments
- `GET /api/v2/comments/latest?site=example.com&limit=5`

### Read vote summary
- `GET /api/v2/posts/:postId/votes`

### Set vote
- `PUT /api/v2/posts/:postId/vote`
- Body: `{ "value": -1 | 0 | 1 }`

## Response Contract

Success:

```json
{ "data": {}, "meta": {} }
```

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable error",
    "details": {}
  }
}
```

## Content Policy

Comments are plain text only. HTML is not rendered.

## Database Migration

Run:

- `/Users/lingc/Projects/nodejs/MoonTalk/db/migrations/001_v2_optimizations.sql`

It adds:
- Unique index for votes on `(post_id, ip)`
- Vote value check constraint
- Query indexes for comments and latest comments

## Development

Install dependencies and run server:

```bash
pnpm install
pnpm start
```

Run tests:

```bash
pnpm test
```
