# My Project

Basic Node.js + React starter.

## Structure

- `server/` — Express backend (API on port 5050), MySQL via Sequelize
- `client/` — React frontend (Vite, dev server on port 5173)

## Setup

### Server

```bash
cd server
npm install
npm run dev
```

Requires a running MySQL server (e.g. MAMP). Update `server/.env` with your DB host/port/credentials and `JWT_SECRET`.

### Client

```bash
cd client
npm install
npm run dev
```
