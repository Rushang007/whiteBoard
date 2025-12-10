# WhiteBoard - Shared TODO Board

A real-time collaborative TODO board that syncs across all browsers using MongoDB.

## Features

- Full-screen textarea for TODO tasks
- Real-time synchronization (polls every 1.5s)
- Auto-save (debounced 300ms)
- MongoDB backend for persistence
- Supports 50,000+ characters

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (copy `env.sample` to `.env`):
```bash
cp env.sample .env
```

3. Update `.env` with your MongoDB connection string.

4. Run development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173/`

## Vercel Deployment

1. Push your code to GitHub/GitLab/Bitbucket

2. Import your repository to Vercel

3. Add Environment Variables in Vercel Dashboard:
   - `MONGODB_URI` - Your MongoDB Atlas connection string
   - `MONGODB_DB` - Database name (optional, defaults to `whiteboard`)
   - `MONGODB_COLLECTION` - Collection name (optional, defaults to `boards`)

4. Deploy!

Vercel will automatically:
- Build the frontend (`npm run build`)
- Deploy serverless functions from `api/` directory
- Serve the app

## Project Structure

- `src/` - React frontend
- `api/board.js` - Vercel serverless function for API
- `storage.js` - MongoDB storage layer
- `server.js` - Standalone Node.js server (for local/testing)
- `vercel.json` - Vercel configuration

## Database Schema

- **Collection**: `boards` (configurable)
- **Document**: Single document with `_id: 'singleton'`
- **Fields**:
  - `content` (string) - The board content (supports 50,000+ characters)
  - `updatedAt` (number) - Timestamp of last update
