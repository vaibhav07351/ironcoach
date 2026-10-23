# Phase 5 handoff: DONE (2026-10-24)

Phase 5 was implemented in one session. See "Phase 5 result" in `relaunch-plan.md` for what
changed, what was verified and the known gaps, and section 6 of `owner-todo.md` for what is left
for the owner. The text below is the original brief, kept for history.

---

# Phase 5 handoff (start Phase 5 in a fresh chat from this file)

How to start: open a new Claude Code chat in `D:\Project Apps\ironcoach`, then say:
"Read ironcoach/docs/phase5-handoff.md and ironcoach/docs/relaunch-plan.md, then plan and
implement Phase 5." Rules in the user's global and project CLAUDE.md apply (no commits, no
deletions without asking, plans go in files, owner actions go in docs/owner-todo.md).

## State at the end of Phase 4 (2026-10-24)

- Backend (Go, `ironcoach/backend`): hardened, DB-backed authorization, trainers keyed by user id,
  per-user time zones, account deletion, typed errors, indexes, CI test gate. All tests pass
  (`MONGODB_TEST_URI=mongodb://127.0.0.1:27099 go test ./...` needs a local mongod; see below).
- Frontend (Expo, `ironcoach/frontend`): new foundation (HTTP client, secure token, native Google
  sign-in, state-driven navigation, design system, account screen). `npm run verify` is green:
  tsc 0 errors, lint 0, Jest 22 tests, Android bundle builds. Not run on a device yet.
- Production database was cleared (no users). No migrations exist.
- Docs: `relaunch-plan.md` (decisions, results per phase, API changes), `owner-todo.md`.

## Phase 5 goal: the v1 product (see relaunch-plan.md, "Phase 5")

Trainer: Today screen (who trained, who is slipping, requests, dues), client list with last
logged, one client screen with sections (replace tabs-in-tabs), **fees and attendance** (packages by
sessions or monthly, mark attended, dues, one-tap WhatsApp reminder with UPI link; recording only,
no payments), trainer can log for clients who never install.
Client: Today card, quick log, history, streak, weight, leave coach, delete account.
Also: ask for a Play review only after a success moment (for example the 4th logged workout).

## Starting points and known gaps

- New components in `frontend/components` (Screen, AppText, Button, Card, TextField, Chip,
  Checkbox, Empty/Error/LoadingState, DayNavigator, SetEditor). Tokens in `constants/theme.ts`.
- Still old-style and to be redesigned: `DashboardScreen`, `ClientHomeScreen`,
  `TraineeDetailScreen` (+ `AboutTraineeScreen`, `AboutDetailsScreen`), `FirstRunHints`.
- Backend has NO fees, packages or attendance model yet. Needs: model, repository, service,
  controller, routes, indexes, tests, then frontend service and screens. Follow the layering
  (routes, controllers, services, repositories) and the typed-error pattern in
  `services/errors.go`; authorize through `AccessService.AuthorizeTrainee`.
- Dates: local `YYYY-MM-DD` strings only; the server validates and uses the user's time zone.
- Idempotency: creates that may be retried should take a `client_id` (see workout logs).
- Local backend tests need MongoDB: a copy is unpacked at
  `C:\Users\Vaibhav\AppData\Local\Temp\claude\d--Project-Apps-ironcoach\3bcfe9cb-79eb-40da-966d-4aaebcfd62d0\scratchpad\mongo-dl`
  (may be gone in a new session; re-download MongoDB 7 zip if needed). Run it on port 27099.
- Tool gotchas seen this session: avoid apostrophes inside bash heredocs; `rm` needs literal
  paths; Windows CRLF files break multiline perl edits (convert with `sed -i 's/\r$//'` first).

## Suggested Phase 5 order

1. Backend: packages + attendance + dues (model, API, tests).
2. Frontend: services and types for them.
3. Trainer Today screen and client list; client detail with sections (fees, attendance, logs, diet,
   weight, assessments).
4. Client Today card and quick log; streak; review prompt.
5. WhatsApp reminder text with UPI deep link (`upi://pay?...` built on the device).
6. Update docs, owner-todo, tests (`npm run verify`, go tests), bundle check.

## What is left for the OWNER (full list with commands is in docs/owner-todo.md)

1. **Git:** untrack the two committed .exe files, commit (messages are in relaunch-plan.md under
   each phase), run `git add --renormalize .`, push.
2. **GitHub:** secrets `USDA_API_KEY`, `ORACLE_KNOWN_HOSTS`; optional variables `MIN_APP_VERSION`,
   `LATEST_APP_VERSION`.
3. **Server:** nightly Mongo backups, upgrade Oracle to Pay-As-You-Go, UptimeRobot check on
   `/healthz`.
4. **Phone:** EAS development build, install, smoke test (trainer + client on two Google accounts).
5. **Google:** register upload-key and Play-App-Signing SHA-1 on the Android OAuth client.
6. **Legal and store:** publish privacy, terms and delete-account pages (GitHub Pages), Play Data
   safety, Health apps declaration, content rating, store listing. Ask Claude for the page texts
   and form answers when you reach this step.
