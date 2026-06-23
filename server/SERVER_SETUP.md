# Relay Server — Setup & Integration Notes

## What I found in your zip

Solid foundation already in place: Express 5 (ESM), Mongoose models for
User/Conversation/Message, full auth flow (signup/login/logout/session,
bcrypt + JWT cookie), Cloudinary + multer + sharp pipeline for avatars.
Model field names already matched the frontend's `types.ts` contract well
(`status` enum, `avatarUrl`, message `status` enum).

## Bugs fixed in your existing code

1. **`config/db.config.js`** — `connectDB` was defined but never
   `export default`-ed, so `index.js`'s import would crash at boot. Fixed,
   and added `process.exit(1)` on connection failure so a bad Mongo URI
   fails loudly instead of letting the server boot in a broken state.
2. **`utils/uploadToCloudinary.utils.js`** — `stream.end(buffer)`
   referenced an undefined variable `buffer` instead of the actual
   parameter `fileBuffer`. Fixed. Also added the missing `.js` extension on
   its own import (`cloudinary.config.js`), required under ESM.
3. **`controllers/AuthController.js`** imported `formatUser` from
   `utils/transformers.js`, which didn't exist in the zip. Created it (see
   below) — auth now actually works end-to-end.
4. **`sharp`** was used in `compressImage.utils.js` but missing from
   `package.json`. Added (`^0.34.4`).
5. **`index.js`** never called `connectDB()` — the server would boot
   without ever touching the database. Rebuilt `index.js` to connect first,
   then start listening only once connected.

## What I added

| File | Purpose |
|---|---|
| `utils/transformers.js` | Converts Mongoose docs → exact frontend `types.ts` shapes (`formatUser`, `formatMessage`, `formatConversation`). Every response goes through these — no raw Mongoose docs are ever sent to the client. |
| `controllers/UserController.js` + `routes/UserRoute.js` | `GET /api/users`, `GET /api/users/:id`, `PATCH /api/users/:id`, `POST /api/users/:id/avatar` (multipart, via existing multer/cloudinary/sharp pipeline). |
| `controllers/ConversationController.js` + `routes/ConversationRoute.js` | `GET /api/conversations`, `GET /api/conversations/:id`, plus `POST /api/conversations` (not in the original contract — needed so the frontend can start a new conversation with a user who doesn't have one yet). |
| `controllers/MessageController.js` (routes nested under ConversationRoute) | `GET /api/conversations/:id/messages` (cursor-paginated), `POST /api/conversations/:id/messages`, `POST /api/conversations/:id/read`. |
| `controllers/AIController.js` + `routes/AIRoute.js` | `POST /api/ai/suggestions` — ships with the same rule-based tone generator the frontend mock used, so it works immediately. Swap the function body for a real LLM call whenever you want. |
| `sockets/index.js` | Real Socket.IO server. JWT-authenticated via the same `token` cookie auth already uses. Each user joins a `user:<id>` room. Emits `presence:update` on connect/disconnect, relays `typing:update` between participants, and `message:new` is emitted from `MessageController.sendMessage` after a message is saved. |

## A design decision worth knowing about: unread counts

Your original `ConversationModel` had no `unreadCount` field — and it
shouldn't, because unread count is inherently **per-user**, not a single
flat number on a conversation shared by two people. I added a `lastReadAt`
map on `Conversation` (keyed by user id → timestamp), and `unreadCount` is
now **computed on read**: count of messages not sent by the requesting
user, created after their `lastReadAt` for that conversation. This avoids
an entire class of "unread counter got out of sync" bugs you'd otherwise
have to debug later.

## Cursor pagination for messages

Matches `Paginated<Message>` from the contract. The cursor is the
`createdAt` ISO timestamp of the oldest message currently loaded; each
page fetches messages strictly older than that cursor, so infinite-scroll-
upward works without duplicate or skipped messages.

## Environment variables

Your `.env` only had `MONGO_URI`. I added placeholders for everything else
the code now needs — **replace these with your real values**:

```
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

JWT_SECRET=replace_with_a_long_random_secret_string

cloud_name=replace_with_your_cloudinary_cloud_name
api_key=replace_with_your_cloudinary_api_key
api_secret=replace_with_your_cloudinary_api_secret
```

`CLIENT_URL` is used for both REST CORS and Socket.IO CORS — keep it
pointed at wherever your Vite dev server runs (default `5173`).

## How to run it

```bash
cd relay-server
npm install
# edit .env with your real JWT_SECRET and Cloudinary credentials
npm run server
```

It will refuse to start listening until MongoDB connects successfully
(by design now — see bug fix #1 above).

## Connecting the frontend

In your frontend's `src/api/config.ts`:

```ts
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  USE_MOCK: false, // flip this
  ...
};
```

Then implement the `TODO(backend)` fetch blocks already stubbed in each
`src/api/services/*.ts` file — they're written to match these exact
endpoints. A few notes:

- **Auth uses httpOnly cookies**, not a bearer token in the response body
  alone. Every `fetch` call from the frontend needs `credentials: 'include'`
  so the cookie gets sent. The response still includes `token` in the JSON
  body too (matching `AuthPayload`), but the server doesn't require you to
  manually attach it — the cookie does the work.
- **Avatar upload** expects `multipart/form-data` with a field named
  `file` — matches what `userService.updateAvatar` in your `API_CONTRACT.md`
  already describes.
- **Realtime**: replace `src/api/mockSocket.ts`'s internals with a real
  `socket.io-client` instance pointed at `BASE_URL`'s origin, with
  `{ withCredentials: true }` so the JWT cookie authenticates the socket
  handshake. The event names (`message:new`, `typing:update`,
  `presence:update`) match exactly, so your existing `useMockSocket.ts`
  hook's listener logic should need minimal changes — mostly swapping
  `mockSocket` for the real client.
- **Typing**: the client now needs to emit `typing:update` with
  `{ conversationId, isTyping, recipientId }` (the server relays it only to
  `recipientId`, not broadcast to everyone) — your frontend's
  `presenceService.subscribeToTyping` mock didn't need a recipient since it
  was all client-side; this is a small but necessary shape addition for the
  real version.

## Things I did not build (flagging, not assuming)

- **Real LLM integration** for AI suggestions — currently rule-based,
  matching your mock exactly. Swap `controllers/AIController.js`'s
  `buildSuggestions` function when ready.
- **Rate limiting / input sanitization beyond basic validation** — worth
  adding before any real deployment.
- **Refresh tokens** — current JWT is a single 7-day token, no refresh flow.
- **Pagination on `GET /api/users`** — currently returns everyone at once;
  fine for now, but worth revisiting if your user base grows.
