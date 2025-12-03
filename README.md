# StreetPaws — local dev setup

This workspace contains a small React + TypeScript frontend and a Node/Express backend which persists data to MongoDB.

Quick overview:
- Frontend: index.tsx (Vite + React)
- Backend: server/index.js (Express + MongoDB / Mongoose + auth + AI chat proxy)
 - Database: MongoDB (database = streetpaws_db by default)

Important: this workspace contains a local `.env` (for convenience during development) with your Gemini API key. Do not commit a real API key to public repos. Keep `.env` in `.gitignore`.

Prerequisites
- Node.js (>=18)
- npm
- A running MongoDB instance (local mongod on 127.0.0.1:27017 or MongoDB Atlas)

Start the app
1. Install dependencies:

```bash
npm install
```

2. Start the backend server (Express) — this connects to MongoDB using MONGO_URI from `.env` and will create collections as needed:

```bash
npm run server
```

Testing the backend locally
- Make sure a MongoDB server is available (see below). With the server running you can test the API with curl or Postman.

- Signup example:

```bash
curl -X POST http://localhost:4000/api/signup -H "Content-Type: application/json" -d '{"name":"Test","email":"test@example.com","password":"secret"}'
```

- Login example:

```bash
curl -X POST http://localhost:4000/api/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"secret"}'
```

- Get pets (public):

```bash
curl http://localhost:4000/api/pets
```

3. Start the frontend dev server (Vite) in a second terminal:

```bash
npm run dev
```

4. Open http://localhost:5173 in your browser to view the app.

Notes about the Gemini API key
- The backend reads the API key from `.env` (API_KEY). You provided a key already in `.env` for convenience.
- The frontend calls the backend endpoints; we proxy AI-completions server-side so the key remains protected.

If you prefer to run both at once (concurrently):

```bash
npm run start:all
```

If you get a database connection error on startup, ensure MongoDB is running and MONGO_URI is set correctly in your `.env` (default mongodb://127.0.0.1:27017/streetpaws_db).

Running MongoDB locally

- To develop locally you can install MongoDB Community Server and run `mongod` (it typically listens on 27017). The default `.env` is set to use `mongodb://127.0.0.1:27017/streetpaws_db`.
- Alternatively you can use MongoDB Atlas (cloud). Create a free cluster, obtain the connection string and set `MONGO_URI` in `.env`.
