# Masjid My Community

**Empowering Masjids. Strengthening Communities.**

A crowdfunding and empowerment platform connecting verified masjids with donors who want to fund construction, renovation, education, sustainability, and community welfare projects. Includes a public marketing site and an admin panel for managing masjids, campaigns, donations, and verification.

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
