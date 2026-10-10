# 🎮 PartyPlay - Interactive Party Game & Voting Platform

Players open a link on their phone - **no account, no login** - and play. The host creates image / video / audio
questions, quizzes and polls, and can run them as a **Live First-Click Buzzer**: the first player to tap an option is
recorded by the server, the question locks for everyone instantly, and the host moves on with **Next Question**.

**Stack:** React + Vite + React Router + Axios · Node + Express · MongoDB + Mongoose · Socket.IO · JWT (admin) · Multer

---

## 1. Quick start

Requirements: Node 18+, a MongoDB (local, or a free MongoDB Atlas cluster).

```bash
cd party-game-app
cp .env.example .env          # then edit it: MONGO_URI, JWT_SECRET, PLAYER_TOKEN_SECRET, ADMIN_PASSWORD
npm run install:all           # installs root + server + client
npm run dev                   # API on :5000, client on :5173
```

Open **http://localhost:5173** (players) and **http://localhost:5173/admin/login** (host).
The first admin is created automatically from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env`.
Generate secrets with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

**Phones on the same wifi:** the dev server listens on your LAN, so open `http://<your-computer-ip>:5173`.

### Production (single server)

```bash
npm run build      # builds client/dist
NODE_ENV=production npm start   # Express serves the API, /uploads AND the React app
```
In production set strong secrets (the server refuses weak ones), `TRUST_PROXY=1` behind a proxy/PaaS, and
`COOKIE_SAMESITE=none` only if client and API are on different sites (needs HTTPS).

---

## 2. Interaction modes

| Mode | Behaviour |
|---|---|
| **🎯 First correct wins** (default for questions) | Everyone gets **one chance**. A wrong answer does **not** stop the game - that player is just out for this question. The moment someone answers **correctly**, the question locks for everyone. |
| **⚡ First click / Buzzer** | Only the first click counts, right or wrong, then the question locks. |
| **🗳️ Normal voting** | Everyone answers once, nobody is locked out (polls, quizzes). |
| **View only** | Image / video / audio with no buttons. |

"Next Question" or "Reset" gives everybody a fresh chance. In *First correct wins* the right answer stays secret
until the question is decided (results are hidden too, otherwise vote counts would give it away).

## 2b. How the lock works (the critical part)

```
Player taps B ──► POST /api/games/:id/answer {optionIndex}
                       │
                       ▼
        Game.findOneAndUpdate(
          { _id, answerStatus: 'open', ... },          ◄── ONE atomic MongoDB operation
          { answerStatus: 'locked', firstResponder, selectedAnswer, answeredAt, isCorrect } )
                       │
        matched? ──yes──► you are first → Socket.IO `question:locked` to everyone
                 └─no───► 409 QUESTION_ALREADY_ANSWERED (+ who won)
```

* MongoDB applies the update to a single document atomically, so with 50 simultaneous taps exactly **one** matches
  `answerStatus: 'open'`. No read-then-write gap, no app-level locks.
* A wrong answer locks the question just like a correct one. Locks belong to the **question**, never to a user:
  **Next Question** / **Reset** open a fresh chance for everybody.
* The client only says *which option*. The server decides first / correct / allowed / published / in time window.
* Anonymous identity: the server issues a **signed player token** (`X-Player-Token`, stored in localStorage).
  Clients cannot invent or edit player ids.

Run the race test (needs a reachable MongoDB; uses a throw-away `<db>-race-test` database):

```bash
npm run test:race     # buzzer + first-correct races: 50 simultaneous players, one-chance rule, admin-lock check
```

---

## 3. Using it

**Admin → Create Game** → choose a content type (Image/Video/Audio only, Image/Video/Audio + Question, Quiz, Poll)
→ upload media (preview + progress) → question, options, correct answer → pick **Normal voting** or
**First click / Buzzer** → Publish.

**Live party flow:** share `/live` (QR button on *Live Control*). Everyone sits on that page.
On **Admin → Live Control** use **▶ Start**, **🔒 Lock**, **🔄 Reset** and **➡️ Next Question**.
Every connected phone switches to the next question instantly.

Public pages: `/` games · `/live` current live question · `/game/:id` one game · `/results` public results.

---

## 4. API

Public (no login; answering needs the anonymous player token):
```
POST /api/player/session           get/renew anonymous identity
GET  /api/games                    published games
GET  /api/games/live               current live question
GET  /api/games/:id
POST /api/games/:id/answer         (aliases: /respond, /vote)
GET  /api/games/:id/results
GET  /api/results                  all games whose results are public
```
Admin (HTTP-only JWT cookie; `/api/auth/*` is an alias of login/logout/me):
```
POST /api/admin/login | /logout    GET /api/admin/me        GET /api/admin/stats
POST /api/admin/upload             DELETE /api/admin/upload/:key
GET|POST /api/admin/games          GET|PUT|DELETE /api/admin/games/:id
PATCH /api/admin/games/:id/publish GET /api/admin/games/:id/results
POST /api/admin/games/:id/reset | /lock | /open
GET  /api/admin/live               POST /api/admin/live/next | /set | /clear
```
Socket.IO events: `games:changed`, `live:changed`, `question:opened|locked|reset`, `poll:updated`.

---

## 5. Project layout

```
server/  config/ controllers/ middleware/ models/ routes/ services/(storage/) validators/ scripts/ uploads/
client/  src/{components,pages(+admin),services,hooks,context,utils}
```

**Storage abstraction:** everything goes through `server/services/storage/`. To move to S3/Cloudinary, add a driver with
the same interface as `localDriver.js`, register it in `storage/index.js`, set `STORAGE_DRIVER`.

---

## 6. Security notes

bcrypt (12 rounds) · JWT in HTTP-only cookie · every admin route behind `requireAdmin` · CSRF header check ·
Helmet + CSP · CORS allow-list · rate limits (global, login, new-identity, per-player answers) · zod validation on all
input (also blocks NoSQL operator injection) · Mongoose `sanitizeFilter` · uploads: extension + MIME whitelist, per-type
size limits, random file names · correct answers are never sent to players before they are legitimately revealed ·
secrets only in `.env`.

### Known limits (honest list)
* Anonymous = no account. A determined cheater can clear localStorage to get a new identity. Creating new identities is
  rate-limited per IP (100/hour), which stops casual abuse; for high-stakes games add a join code or per-IP caps.
* Uploads are validated by extension/MIME, not by file-content sniffing. Only trusted admins can upload.
* `.mov` / `.m4a` upload fine but browser playback support varies (Safari plays them best); prefer MP4 / MP3.

---

## 7. Test checklist (Phase 7)

| Scenario | How |
|---|---|
| Wrong password / lockout | 11 bad logins → 429 |
| Unauthorized API | `curl /api/admin/games` → 401 |
| Invalid / huge file | upload `.exe` → 415; file over limit → 413 |
| Buzzer race | `npm run test:race`, or 10 browser windows on `/live` |
| Duplicate vote | vote twice on a poll → 409 `ALREADY_RESPONDED` |
| Next question | Live Control → Next; all windows unlock |
| MongoDB down | stop mongod → API answers 503 `DATABASE_UNAVAILABLE`, `/api/health` 503 |
| Layouts | browser dev-tools device toolbar (phone / tablet / desktop) |
