# WeHub

A video platform built on the [T3 Stack](https://create.t3.gg/) (Next.js 15, tRPC 11, Drizzle ORM, Tailwind CSS 4, SQLite via libsql).

## Features

- **Accounts**: register and sign in with a username or email and a password. Passwords are hashed with scrypt. Sessions are stored in the database, and the browser holds an httpOnly cookie. Sessions last 30 days and extend while you use the site.
- **Upload**: drag and drop a video (MP4, WebM, MOV, MKV, …). The file streams to disk without being held in memory. The browser reads the duration and generates a thumbnail from a frame of the video.
- **Watch**: player with seeking (HTTP Range support), view counts, "Up next" suggestions, and search by title.
- **Like / dislike**: one reaction per user. Updates show immediately, before the server confirms.
- **Favorites**: heart a video; see them all at `/favorites`. Liked videos are at `/liked`.
- **Playlists**: create public or private playlists, add videos from the watch page ("Save"), reorder and remove items, and play a playlist in order (it moves to the next video when one ends).
- **Download**: download the original file, named after the video title.
- **Channels**: `/u/<username>` lists a user's videos and public playlists. Owners can edit or delete their videos.

## Getting started

```bash
pnpm install
cp .env.example .env     # adjust UPLOAD_DIR / MAX_UPLOAD_MB if needed
pnpm db:push             # create the SQLite tables
pnpm dev
```

| Variable        | Default           | Description                          |
| --------------- | ----------------- | ------------------------------------ |
| `DATABASE_URL`  | `file:./db.sqlite`| libsql/SQLite connection URL         |
| `UPLOAD_DIR`    | `./uploads`       | Where video files and thumbnails go  |
| `MAX_UPLOAD_MB` | `2048`            | Maximum video size per upload        |

## Layout

```
src/server/auth/           password hashing, sessions, login/register/logout server actions
src/server/api/routers/    tRPC routers: auth, video, playlist
src/server/storage.ts      upload directory helpers
src/server/video-file.ts   streaming upload writer + Range-aware file serving
src/app/api/videos/[id]/   upload, thumbnail, stream and download route handlers
src/app/                   pages: home, watch, upload, favorites, liked, playlists, user channel, auth
```

### Upload flow

1. `video.create` (tRPC) creates a `pending` video record with its metadata.
2. The client sends the JPEG thumbnail to `PUT /api/videos/:id/thumbnail`, then the raw file to `PUT /api/videos/:id/upload`. The server streams the file to disk, enforces the size limit, and marks the video `ready`.
