# EventNest backend

Node.js and Express API scaffold. MongoDB is required at startup; the server begins listening only after Mongoose connects.

1. Copy `.env.example` to `.env` and set `MONGODB_URI` for your MongoDB instance.
2. Run `npm install`.
3. Run `npm run dev` for local development, or `npm start` for a normal process.

`GET /health` returns `{ "status": "ok" }` once the server is running. Run `npm test` for the built-in Node.js tests. This scaffold has no event, user, payment, or ticket routes yet.
