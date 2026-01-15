# Fixes Applied to Development Environment

## Connection Refused on Port 3001
The application was failing to connect to the backend API because of a port mismatch configuration.
- **Frontend (Vite)**: Configured to look for API at `http://localhost:3001` (in `vite.config.ts` and `.env.example`).
- **Dev Server Script (`dev:with-api`)**: Was configured to start the API on port `5252`.
- **Dev API Server**: Was configured to listen on port `5252`.

**Fixes Applied:**
1.  Updated `scripts/start-dev-with-api.cjs`: Changed default `DEV_API_PORT` from `5252` to `3001`.
2.  Updated `scripts/dev-api-server.cjs`: Changed default `PORT` from `5252` to `3001`.

Now, running `npm run dev:with-api` will correctly start the API on port 3001, matching the frontend's expectation.

## Google Docs Initialization Error
The error `Failed to load Google Identity Services script` suggests a network issue or Content Security Policy (CSP) blocking the loading of `https://accounts.google.com/gsi/client`.
- This is a client-side issue.
- Ensure you have a valid internet connection.
- Ensure `VITE_GOOGLE_CLIENT_ID` is set in your `.env` file (copy from `.env.example` if needed).

## How to Run
To start the development environment with the API:

```bash
npm run dev:with-api
```

This will start:
- Frontend: `http://localhost:5173`
- Local Mock API: `http://localhost:3001`

If you need the **Real Backend** (connected to databases/services), use:
```bash
npm run start:production
```
(And run `npm run dev` in a separate terminal for the frontend).
