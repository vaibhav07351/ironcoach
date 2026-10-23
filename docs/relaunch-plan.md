# Relaunch plan: TrainerNearMe / IronCoach

Status: approved, Phase 0 in progress. Date: 2026-10-12.

## Decisions (2026-10-12)

| Topic | Decision | Effect on the plan |
|---|---|---|
| Real users | None in production | Breaking changes are fine. Phase 3 is one migration, no dual-read period. The forced-update OTA to the old build is dropped; the new build ships with the `/config` update gate built in. |
| Play account | Company (organization) account; app already live | The 14-day / 12-tester closed test does not apply. Closed testing is still used for QA, not as a gate. Package `com.vaibhavbhardwaj.ironcoach` is fixed. Account deletion and privacy policy are urgent because the live listing needs them. |
| Domain | No paid domain | API stays on `ironcoach.duckdns.org`. Privacy policy, account deletion, invite landing pages and the App Links file (`/.well-known/assetlinks.json`) go on free GitHub Pages. A domain can be added later with a config change and a rebuild. |
| Store title | "TrainerNearMe: PT Client Manager" | Used in the listing work. |
| New libraries | Approved | `expo-secure-store`, `@react-native-google-signin/google-signin`, `@react-native-community/netinfo`, later `expo-notifications`, `react-native-view-shot`, `expo-sharing`. |

## Progress

- [x] Phase 0.1 `.gitignore` restored (`.env`, service account files, binaries), `.gitattributes` added.
- [x] Phase 0.2 Legacy routes removed (`/registerTrainer`, `/login`, `/getTrainers`, `/deleteTrainer/:email`); password code and bcrypt removed; tokens without `user_id` or a valid role are rejected (test: `backend/middlewares/auth_test.go`).
- [x] Phase 0.3 Image upload requires login, 5 MB cap, JPEG/PNG/WebP sniffed from the bytes, 30 s Cloudinary timeout, resized to max 1080 px, rate limited.
- [ ] Phase 0.4 Nightly backup + test restore (needs the owner's Oracle access).
- [ ] Owner: decide whether to untrack `backend/bin/ironcoach.exe` and `backend/main.exe` from git.
- [x] Phase 2 Backend hardening (2026-10-13), see "Phase 2 result" below.
- [x] Phase 3 Data model (2026-10-13), see "Phase 3 result" below.
- [x] Phase 4 Frontend foundation (2026-10-24), see "Phase 4 result" below.
- [x] Phase 5 v1 screens, fees and attendance (2026-10-24), see "Phase 5 result" below.

## Phase 2 result (backend hardening, done 2026-10-13)

Verified: `go build`, `go vet`, `gofmt` clean; unit tests (middlewares, repositories, services)
and Mongo integration tests (services, routes) pass, repeated 5x for the race tests; HTTP smoke
test of the real binary against a local MongoDB.

What changed:
- **Access from the database.** `AuthMiddleware` verifies the token, then loads the user
  (`services.AccessService.ResolvePrincipal`). Role, coach link and client link come from the
  database on every request, so linking, unlinking, client deletion and account deletion take effect
  immediately. Fixes the "client locked out after coach accepts" bug with no app change.
- **Ownership checks on every record.** Workout logs, diet entries and progress are checked in the
  service layer (`AuthorizeTrainee`), including routes addressed by record id.
- **Typed inputs.** `WorkoutLogInput/Update`, `DietEntryInput/Update`, `TraineeInput`: unknown
  fields are ignored, `trainer_id`/`user_id`/`rating`/timestamps can no longer be set by clients,
  coach-only fields (notes, status, membership, assessments) are dropped for clients, and the
  trainer's private notes are hidden from the client.
- **Validation.** Dates must be `YYYY-MM-DD`; sets must match reps and weights; numbers are bounded
  and finite; text lengths capped. Progress calculations tolerate old mismatched data.
- **Race-safe linking.** Invite redeem and coach-request accept use conditional writes with
  rollback; proven by concurrent integration tests (10 clients, 1 code: exactly 1 wins).
- **Account lifecycle.** `DELETE /me` (body `{"confirm":"DELETE"}`) with full cascade including
  Cloudinary images, idempotent and retry-safe. `POST /me/leave-coach`. Deleting a client cascades
  and unlinks their account.
- **Coach requests.** Max 5 open per client, 7-day cooldown after a decline, clients can list and
  cancel their own (`GET /coach_requests/mine`, `POST /coach_requests/:id/cancel`).
- **Idempotency.** Optional `client_id` on `POST /workout_logs` (retry returns the original, 200);
  one diet entry and one weigh-in per client per day.
- **Indexes** created at startup (unique where it matters, partial for optional fields); failures are
  logged, never crash the server.
- **Ops.** JSON structured logs with request id, `/healthz` (pings Mongo), `/config` (app version
  gate), server timeouts, graceful shutdown, 1 MB JSON body cap, rate limiter fixed (no header
  spoofing, no data race), single CORS config, typed errors everywhere touched, CI test gate with
  MongoDB service, pinned SSH host key support, USDA key passed to production.
- **Catalog** default exercises are seeded once per client (2 bulk inserts), no longer re-seeded on
  read.

API changes the Phase 4 app must use:
- New: `DELETE /me`, `POST /me/leave-coach`, `GET /coach_requests/mine`,
  `POST /coach_requests/:id/cancel`, `GET /config`, `GET /healthz`.
- Creates return 201 (`/trainees` returns `{id}`, `/workout_logs` returns `{log}`, `/diet_entries`
  returns `{id}`); a second diet entry for the same day returns 409 `entry_exists`.
- Lists accept `limit` and `offset` (trainees default 200, logs 50, diet 31).
- All errors use `{ "error": { "code", "message" } }`; 401 codes: `token_missing`,
  `token_invalid`, `token_outdated`, `account_not_found` (app should sign out on any 401).
- Removed: `/registerTrainer`, `/login`, `/getTrainers`, `/deleteTrainer/:email`, `/profile`.

Known gap carried forward: client account deletion keeps the coach's own record of the client
(unlinked, email removed). The privacy policy must say so.

Owner actions from every phase live in `docs/owner-todo.md`.

## Phase 3 result (data model, done 2026-10-13)

Verified: build, vet, gofmt clean; all unit and Mongo integration tests pass (repeated 3x); the
real server binary starts and reports healthy.

**Fresh start instead of migration (owner decision, 2026-10-13).** Nobody uses the app, so the
production `ironcoach` database was cleared (51 test documents deleted, collections and connection
string kept) and no data migration exists. The new backend starts on empty collections.

What changed:
- **Trainers are identified by their user id**, not email, everywhere: client records, invites,
  coach requests, ratings, the client's coach link, the trainer profile (`trainers.user_id`).
  A changed Google email no longer breaks anything, and trainer emails are never exposed.
- **Time zones.** Each user has a `timezone` (IANA, default Asia/Kolkata), sent by the app at
  sign-in or set with `PUT /me/settings`. Weeks, "yesterday" and streaks use it (trainer roster uses
  the trainer's zone). A streak is no longer broken just because today is not logged yet. Dates more
  than one day in the future are rejected.
- **Discovery privacy.** Results carry `id` (trainer user id) instead of email, coordinates rounded
  to about 1 km, distance rounded to 0.1 km; contact fields are never loaded; at most 2000 candidates.
- **Trainer profile** updates are validated (lat/lng ranges, rate, experience, type, https image)
  and the logic moved from controller to service. All auth/onboarding/rating errors are typed.
- `MONGODB_DB` env var selects the database (tests use separate databases).

API changes the Phase 4 app must use (in addition to Phase 2):
- `POST /coach_requests` body is `{"trainer_id": "<24-hex user id>"}` (was `trainer_email`).
- Discovery items: `id` instead of `email`.
- `/me` and sign-in return `timezone`; `POST /auth/google` accepts optional `timezone`;
  new `PUT /me/settings {"timezone"}`.
- `user.trainer_id`, `trainee.trainer_id`, rating `to_id` for trainers are user ids.
- The trainer profile JSON has `id` (user id).

Effect on the currently published app: its "find a coach" request sends `trainer_email`, which is
now rejected. Acceptable: there are no users, and discovery is out of v1.

Suggested commit message:
```
Phase 3: trainer user ids, timezone-aware dates, discovery privacy

- Key trainers by user id across trainees, invites, requests, ratings, users
- Remove legacy email-keyed compatibility (database starts fresh)
- Per-user timezone for weeks and streaks; reject future dates
- Discovery returns ids and ~1 km coordinates, never email
- Validate trainer profile updates in the service; typed auth errors
- HTTP integration tests for discovery, requests, ratings, settings
```

## Phase 4 design (frontend foundation, started 2026-10-13)

Goal: the app runs on a clean, typed foundation and works end to end against the hardened backend.
Screens that Phase 5 redesigns get only a mechanical move onto the new layer plus fixes for bugs
that lose data; no restyling twice.

Built new in Phase 4:
- **Config**: `app.config.js` replaces `app.json` (version 1.1.0, `runtimeVersion: {policy:
  "appVersion"}` so over-the-air updates never reach an incompatible build, API URL and OAuth ids
  from `EXPO_PUBLIC_*` env with production defaults, Android permissions trimmed to internet +
  coarse location, keyboard `resize` mode). `eas.json` gets a channel per profile.
- **API layer** (`app/services/http.ts`): one `request()` used by every screen; 15 s timeout,
  `Bearer` token from a token store, typed `ApiError {status, code, message}`, network errors as
  `ApiError(0, "network")`, and any 401 signs the user out. One service module per domain.
- **Token storage**: `expo-secure-store` (encrypted) on native, AsyncStorage on web.
- **Google sign-in**: native `@react-native-google-signin/google-signin` (system account picker),
  web keeps `expo-auth-session` (playbook rule: auth-session fails on native release builds).
- **Navigation by state**: the root navigator picks Splash, Sign-in, Onboarding, Update-required,
  Trainer tabs or Client tabs from auth state; no screen redirects by hand any more.
- **Design system** (light only): tokens in `constants/theme.ts`; `Screen`, `AppText`, `Button`,
  `TextField`, `Card`, `EmptyState`, `ErrorState`, `LoadingState`, `Chip`; one icon library
  (`@expo/vector-icons`); `confirmAction()` that also works on web.
- **Dates**: `app/utils/date.ts`, local calendar dates only (`YYYY-MM-DD` in the device zone);
  the device time zone is sent at sign-in.
- **Account**: Account screen for both roles (time zone, leave coach, delete account with typed
  confirmation, sign out, privacy link). Sign-up requires ticking "18 or older + terms"; joining a
  coach requires consent to share logs. Both are recorded by the backend.
- **Update gate**: `GET /config`; if the app version is below `min_supported_version`, a blocking
  screen links to the Play Store.

Removed: unused libraries (Skia, Victory, d3, two date pickers, checkbox, webview, community image
picker, react-native-vector-icons, blur, symbols, random-values and stale type packages), Expo
template leftovers, the dead Signup screen and ThemeContext, the committed `dist/` build output.

Verification: `tsc` and lint with zero errors, Jest unit tests (date utils, HTTP client, version
compare), `expo export` bundling for Android, backend tests for the consent fields. Not possible
here: running on a device (needs an EAS development build, see owner to-do).

## What we're doing

Make this the free app an Indian personal trainer opens every day to run their clients. Today they
use WhatsApp plus Excel. Downloads come without ads because every trainer who adopts it invites 10
to 30 of their own clients.

First we lock down the backend, which has real security holes today. Then we rebuild the app
around one daily loop: the trainer assigns, the client logs, the trainer sees it.

## The big picture

The app today is like a gym with a nice shop window (the "find a coach near me" swipe screen), an
unlocked back door (security holes) and half-built equipment inside (broken screens).

The shop window cannot bring people in yet. Nobody browses a "coaches near me" list that has no
coaches in it. That is the **cold-start problem**: neither side joins a two-sided app until the
other side is already there. Fix the door first, then the equipment, and let members bring friends.

```
TODAY                                       AFTER v1
-----                                       --------
Client --> swipe "coaches near me"          Trainer --> adds clients (they don't even need the app)
           (empty list, no reason to stay)             --> attendance + fees + WhatsApp reminder with UPI link
Trainer --> enter data for clients                     --> invites clients over WhatsApp --+
           (many screens, data gets lost)                                                  |
Backend --> anyone can edit anyone's logs   Client  <-- joins with code <------------------+
                                                     --> "Today" card, log in under 30 seconds, streak
                                            Trainer <-- sees who trained and who is slipping
                                            (discovery and public coach pages come back later,
                                             once there are real trainers to show)
```

## What I found

Every critical claim below was checked directly in the code.

### Two things to fix today

- `.gitignore`: the lines that keep `.env` out of git (`.env`, `!.env.example`) were removed and the
  change isn't committed. A single `git add .` would commit the database, JWT, Cloudinary and
  Google secrets. Git history is clean, so nothing has leaked yet.
- Audit side effect: while auditing, `npm run lint` auto-installed the linter (ESLint). That changed
  `frontend/package.json` and `frontend/package-lock.json` and created `frontend/eslint.config.js`.
  They are left in place. Recommendation: keep them, since lint now works.

### Backend security, critical

- **Any logged-in user can read and change other people's records.** Diet, workout and progress
  entries are fetched by ID with no ownership check (`backend/routes/diet_entry.go`). This is called
  an **IDOR** (insecure direct object reference): you reach someone else's data just by changing an ID.
- **Image upload needs no login and has no size or type limit** (`backend/routes/upload_route.go`).
- **The admin is a hardcoded email:** `admin@gmail.com` (`backend/controllers/trainer.go:250`).
- **The rate limiter can be bypassed.** It trusts the `X-Forwarded-For` header, which any caller can
  fake (`backend/middlewares/rate_limit.go:172`).
- **Anyone can create a trainer profile under any email.** `/registerTrainer` is public, and a real
  trainer who later signs in with Google gets linked to that profile.
- `/getTrainers` publicly returns every trainer's phone number, date of birth and exact location.

### Backend, broken logic

- After a coach accepts a client, the client's login token still says "no trainer". They are locked
  out until they log in again.
- Invite redeem and request accept can double-run when two requests arrive together. This is a
  **race condition**: the outcome depends on which request lands first.
- Deleting a client doesn't unlink their account.
- Mismatched reps and weights arrays crash the server.
- There are no database indexes and no tests.
- Trainers are identified by email everywhere, so if a trainer's email changes, every link to their
  clients breaks.

### Frontend

- About 25 screens call the server directly, with no timeout and inconsistent error handling.
- Saving the Health Questionnaire re-sends an old copy of the client record, which silently undoes
  other edits (`frontend/app/screens/HealthQuestionnaireScreen.tsx:99`).
- Logging a workout wipes the navigation history, so Android back exits the app
  (`frontend/app/screens/AddExerciseFormScreen.tsx:148`).
- Non-gym sessions never show in the log list.
- Dates are handled three different ways, so early-morning logs land on the wrong day.
- `tsc` reports 12 type errors and lint reports 69 errors.
- Several unused libraries (Skia, Victory, three date pickers) bloat the app.

### Play Store blockers

- No account deletion.
- No privacy policy.
- Old storage permissions that Play now flags.
- Health data (lab tests, medical history) that needs a health declaration and user consent.
- Google sign-in uses `expo-auth-session`, which the Expo playbook records as rejected by Google in
  native Android builds.

### Market research

- Global coach apps (Trainerize, TrueCoach, Everfit) charge in US dollars per client.
- Indian gym tools mostly do fees and attendance.
- Nobody offers free fees plus attendance plus workout and diet tracking for independent,
  multi-sport trainers. That's the gap to fill.

## The key choice: what the app is

| Option | Idea | Verdict |
|---|---|---|
| A. Marketplace first (today) | Clients find coaches nearby | Fails at launch: the list is empty, so nobody stays |
| **B. Trainer tool first (recommended)** | Free client manager; clients arrive through invites; discovery later | Useful from day one with zero other users; each trainer brings 10 to 30 installs |
| C. Personal workout tracker | Compete with Hevy or Strong | Very crowded, and it throws away the coach angle |

B is the classic "come for the tool, stay for the network" approach. It is how Thumbtack and similar
apps escaped the cold-start problem.

On build approach:
- **Backend:** fix in place. The layered structure (routes, controllers, services, repositories) is sound.
- **Frontend:** build a new foundation (design system, API layer, navigation by role), then rebuild
  screens on it, reusing the working logic. The nutrition search, invites and adherence scoring are
  worth keeping.
- **Expo Router:** not migrating to it. That is a churn cost with no user benefit.

## The plan

Each phase is shipped and tested before the next one starts. Sizes: **S** is a day or two, **M** is
about a week, **L** is one to two weeks.

### Phase 0: Today's hotfix (S, mostly Claude)

1. Restore `.env` in `.gitignore`. Add `.gitattributes` so Go files use Unix line endings; `gofmt`
   currently flags every file because of Windows line endings.
2. Remove `/registerTrainer`, `/login`, `/deleteTrainer/:email` and `/getTrainers`, and reject old
   tokens that carry no user ID. These routes are the squatting and hardcoded-admin holes.
3. Add auth plus a 5 MB, images-only limit to uploads, with a timeout on the Cloudinary call.
4. **Backups (owner plus Claude):** a nightly database dump to Oracle Object Storage, and one test
   restore to prove it works. The free Atlas tier has no backups at all.
5. **Domain (owner):** buy a real one, about 800 rupees a year, and point it at the server. Keep
   `ironcoach.duckdns.org` working forever so installed apps don't break. Invite links, the privacy
   page and the deletion page all need it.

### Phase 1: Start the Play clock (S, mostly owner, with Claude's help)

- Personal developer accounts need **closed testing**: 12 or more testers opted in for 14 straight
  days before Google allows a public release. This is the longest calendar item, so it starts now
  with the current app after the hotfix, not at the end.
- **Owner:** recruit 15 to 20 testers, ideally 3 to 5 real trainers plus their clients, and talk to
  5 to 10 trainers about how they handle fees and attendance today.
- **Claude:** the privacy policy and account-deletion web pages, the store listing text, and the
  Data Safety and health declaration answers for the owner to submit.
- Fix how app updates are matched to installed builds. Every build currently shares runtime version
  `1.0.0`, so a future over-the-air update could crash older installs that lack the new native code.
  Switch to `runtimeVersion: {policy: "appVersion"}`.
- Add a "please update" screen driven by a new `GET /config` endpoint. Push it to today's installs
  now, while they can still receive updates, so later breaking changes can safely retire old versions.

### Phase 2: Backend hardening (L, Claude)

- **Check ownership in the database, not in the token.** Today the token's `trainee_id` goes stale
  for up to 7 days after an unlink. Reading it from the database fixes stale access, revocation and
  the locked-out-after-accept bug in one place, and needs no new app build.
- Ownership checks on every record route.
- **Field whitelists:** a fixed list of fields each update may change, instead of saving whatever the
  client sends.
- Input validation: sets must match reps and weights; dates must be `YYYY-MM-DD`.
- **Atomic invite redeem and request accept:** each runs as a single conditional database write that
  only succeeds if the invite is still unused, so double taps can't double-link.
- Remove duplicate records first, then add **unique indexes** (the database itself refuses
  duplicates). Optional fields get partial indexes, and the server keeps running if index creation fails.
- **Idempotency keys:** the app tags each new log with an ID, so a retried request can't create a duplicate.
- Account deletion endpoint with a full cascade, including Cloudinary photos, plus a client "leave
  coach" option.
- Pagination on every list endpoint.
- Structured JSON logs, a `/healthz` endpoint, server timeouts and **graceful shutdown** (finish
  in-flight requests before stopping).
- A CI gate that runs build, vet and tests before each deploy, with Go tests for every access rule
  and both race conditions.
- Monitoring: a free uptime check (UptimeRobot) plus Play Console crash stats. No Sentry yet.

### Phase 3: Data cleanup (M, Claude)

- Copy trainer links into new ID fields next to the email fields, then switch reads over. The old
  fields stay for a month as the rollback path.
- Store each date as the user's local day plus a timezone (default Asia/Kolkata), and compute
  adherence in that timezone.
- Old dates saved in UTC with a time part can be converted. Bare dates from early-morning IST logs
  can't be recovered and will be flagged.
- If there are only a handful of real users, do this as a single migration with a forced update
  instead of a long dual-read period (see question 1).

### Phase 4: Frontend foundation, one new native build (L, Claude)

- Separate navigation for signed out, onboarding, trainer and client, chosen automatically by login
  state. This replaces the current single stack where every screen redirects by hand.
- A small design system (Screen, Text, Button, Card, TextField, EmptyState). Light mode only for v1,
  with one icon library.
- One API client everywhere: timeouts, a `Bearer` token header, and automatic sign-out on 401.
- Token stored in `expo-secure-store` (encrypted on the device).
- Native Google sign-in. The owner registers the Play signing SHA-1 fingerprints.
- One date utility used by every screen.
- Remove unused libraries and template leftovers, and get `tsc` and lint to zero.
- In-app account deletion, an 18+ age check, and a consent step when a client links to a trainer.

### Phase 5: v1 screens and features (L, Claude), then apply for production access

- **Trainer, Today screen:** who trained, who's slipping, pending requests, dues.
- **Trainer, client list:** search, a "last logged" column and a slipping flag.
- **Trainer, client detail:** one screen with sections instead of tabs inside tabs.
- **Trainer, fees and attendance:** packages (by sessions or monthly), mark attended, dues, and a
  one-tap WhatsApp reminder with a UPI link. Recording only; no money passes through the app.
- **Trainer, clients who never install still work fully:** the trainer logs on their behalf.
- **Client, Today:** a Today card, a quick log (one searchable exercise picker for gym, or a session
  form for other sports), history, streak and weight.
- **Client, diet logging:** kept; it's a real strength. Fix the duplicate-save bug and remove the
  fake "Whey protein" meal.
- **Client, leave coach and delete account.**
- Ask for a Play review only after a real success moment, for example a client's 4th logged workout.

### v1.1 (after launch)

- Invite landing pages on the domain, with **App Links** so the link opens the app directly. The
  invite code survives the Play install via the **install referrer**.
- Daily local reminders (no server push needed).
- An offline queue for new logs.
- Shareable streak and PR cards. They never show body weight unless the user opts in.

### Later

- Server push notifications.
- Workout plan templates.
- Trainer comments on logs, with report and block.
- Public trainer web pages that rank on Google: city level only, never email or exact location.
- Discovery switched on city by city once enough trainers exist.
- Indian food database.
- Private progress photos.

### Cut from v1

Discovery and ratings, lab tests and medical history (hidden, not deleted, to reduce health-data
risk), dark mode, push, React Query and Sentry.

## How the reviews changed the plan

A separate reviewer attacked the first draft. These are the changes that came out of it:

- Moved the 14-day closed test from the end to week one, because it was silently the critical path.
- Switched ownership checks to the database instead of adding token refresh. Token refresh needed a
  new build and didn't fix revocation.
- Added the forced-update screen and fixed the runtime version early. Otherwise later phases could
  break or crash old installs.
- Made unique indexes cleanup-first and partial, so the server can't crash-loop on existing duplicate data.
- Bought the domain up front. Moving it later would strand installed apps on DuckDNS.
- Cut v1 roughly in half (discovery, push, plans, photos, health data) so a solo build can ship.
- **One reviewer claim was corrected.** It said the legacy routes allow a full account takeover.
  Checked: new registrations can't set a password, because the field is hidden from JSON
  (`backend/models/trainer.go:8`). The real risk is email squatting plus any old password-bearing
  accounts. That is still serious, and still fixed in Phase 0.

## What could go wrong

- **Breaking installed apps:** handled by the forced-update screen, the permanent DuckDNS alias and
  the runtime version fix.
- **Migration damage:** a dump before every migration, scripts that are safe to re-run, and old
  fields kept as the rollback path.
- **Testers drop out mid-test:** recruit 15 to 20 so 12 or more stay; Google may also check that
  testers genuinely use the app.
- **The free server gets reclaimed:** Oracle can reclaim idle Always Free VMs. Upgrading the tenancy
  to Pay-As-You-Go keeps it free within the limits, and backups live off the VM.
- **The idea is wrong:** the trainer interviews in Phase 1 test the fees and attendance hook before
  it gets built.

**Not verified:** the Play account type and the app's current track, how many real users and
records are in production, and anything on a physical device.

**Timeline:** about 6 to 8 weeks to public release. The floor is 14 days of closed testing plus up
to 7 days of Google review.

## Questions for the owner (answered, see Decisions at the top)

1. **How many real users and records are in production?** Recommendation: if it's under about 20,
   do a single migration with a forced update, which saves weeks.
2. **Is the Play developer account personal?** And has an app with package
   `com.vaibhavbhardwaj.ironcoach` already been uploaded? The package name can never change after
   the first upload.
3. **Is about 800 rupees a year for a domain OK?** Recommendation: yes; growth links depend on it.
4. **Name:** keep "TrainerNearMe" with a store title like "TrainerNearMe: PT Client Manager"?
   Recommendation: keep it; it has existing assets and the keyword still fits.
5. **New libraries:** OK to add `expo-secure-store`, `@react-native-google-signin/google-signin` and
   `@react-native-community/netinfo` now, plus `expo-notifications`, `react-native-view-shot` and
   `expo-sharing` in v1.1? Also remove about 12 unused packages and the template files; every file
   gets listed before anything is deleted.
6. **ESLint:** keep the auto-added setup? Recommendation: keep it.

## Terms used

- **IDOR:** reaching someone else's data just by changing an ID in a request.
- **Race condition:** two requests at the same moment both pass a check that only one should pass.
- **Atomic / conditional write:** a single database operation that only succeeds if a condition still holds.
- **Unique index (partial):** a database rule that refuses duplicates; "partial" applies it only to
  records that have the field.
- **Idempotency key:** an ID on a request that makes repeating it safe.
- **Field whitelist:** an explicit list of fields an update is allowed to change.
- **Cascade delete:** deleting a record also deletes everything that belongs to it.
- **Graceful shutdown:** the server finishes in-flight requests before it stops.
- **Runtime version / OTA update:** an update pushed to installed apps without the store; the runtime
  version stops it reaching builds that lack the right native code.
- **Closed testing:** Google's required private test before a personal account can publish publicly.
- **App Links:** web links that open the app directly instead of the browser.
- **Install referrer:** data Play passes to the app on first launch, such as the invite code from the link.
- **Cold start problem:** a two-sided app is useless to each side until the other side shows up.

## Phase 4 result (frontend foundation, done 2026-10-24)

Verified: `tsc` 0 errors (was 12), `expo lint` 0 problems (was 138), Jest 22 tests pass, backend
tests still pass (incl. new consent checks), `expo export --platform android` bundles (4.2 MB Hermes),
`app.config.js` resolves. NOT verified: running on a phone or emulator (needs an EAS development
build, see owner-todo.md), real Google sign-in, Play Store upload.

What changed:
- **Config**: `app.config.js` (version 1.1.0, `runtimeVersion` policy appVersion, trimmed Android
  permissions, env-driven URLs and OAuth ids) replaces `app.json`; `eas.json` has a channel per
  profile; scripts simplified (`npm run verify` runs tsc, lint and tests).
- **One HTTP client** (`app/services/http.ts`): timeout, Bearer token, typed `ApiError`, any 401
  signs out. One service per domain. All ~25 raw `fetch` calls are gone.
- **Secure token storage** (`expo-secure-store`; AsyncStorage only on web).
- **Google sign-in**: native `@react-native-google-signin` on Android, `expo-auth-session` on web.
- **Navigation by state** (`RootNavigator`): Splash, Update-required, Sign-in, Onboarding, Trainer
  tabs, Client tabs. No screen redirects by hand; heavy screens load lazily.
- **Design system**: tokens, `Screen`, `AppText`, `Button`, `TextField`, `Card`, `Chip`,
  `Checkbox`, `LoadingState`, `EmptyState`, `ErrorState`, `DayNavigator`, `SetEditor`.
- **Sign-up consent**: 18+ and terms checkbox; share-with-coach consent when joining. Stored by the
  backend (`terms_accepted_at`, `share_consent_at`).
- **Account screen**: time zone, leave coach, privacy and terms links, sign out, delete account
  (type DELETE). Delete is also reachable while onboarding.
- **Update gate** from `GET /config`.
- **Dates**: local calendar dates only (`utils/date.ts`); the device time zone is sent at sign-in.
- **Bugs fixed on the way**: saving the health questionnaire or an assessment no longer overwrites
  other client fields; logging a workout no longer wipes the navigation stack; editing a workout keeps
  all exercises (was only the first); sport sessions now show in the log list; double taps cannot
  duplicate logs or meals (idempotency keys, one diet entry per day); push-ups no longer filed under
  body composition; coach cannot be spammed; fake "whey protein" meal removed; errors show retry
  states instead of an empty list.
- **Removed**: 14 unused libraries, Expo template files, old Login/Signup/FindCoachHub/Discover/
  InviteRedeem screens, ThemeContext, committed `dist/`, lab-test UI (stored lab data untouched),
  discovery screens (backend discovery stays for later).

Known gaps carried to Phase 5 (screens work on the new foundation but are not yet redesigned):
- The client record is still tabs inside tabs (`TraineeDetail`), the dashboard is the old design.
- No attendance, fees or WhatsApp reminder yet; no dark mode; no in-app review prompt.
- Dashboard and client home keep their own hand-written styles.
- `Screen` wraps new screens only; old screens keep their own scroll containers.

Suggested commit message:
```
Phase 4: frontend foundation on typed API layer, state-driven navigation, design system

- app.config.js, eas channels, secure token storage, native Google sign-in
- single HTTP client with timeout, typed errors and sign-out on 401
- RootNavigator picks screens from auth state; tabs per role; lazy heavy screens
- shared components; account screen with deletion; consent at sign-up and joining
- migrate all screens off raw fetch; fix data-overwrite and navigation-reset bugs
- remove unused dependencies, template files and replaced screens
- Jest tests for http, dates, versions, activity fields, set editor
```

## Phase 5 result (v1 product, done 2026-10-24)

Verified: `go build`, `go vet`, `gofmt` clean; all Go tests pass against a local MongoDB (new unit
tests for the money and package maths, new HTTP integration test for fees, attendance and Today);
`npm run verify` green (tsc 0 errors, lint 0 problems, 40 Jest tests); `expo export --platform
android` bundles (4.2 MB). NOT verified: running on a phone (WhatsApp and UPI links, the Play review
prompt, real layout on a device).

What changed:
- **Fees (recording only).** Packages (`sessions` or `monthly`), payments and attendance, all in
  whole paise. Due = packages sold minus payments recorded; sessions are used up in order by attended
  days (nothing stored, so deleting an attendance day or package always gives consistent numbers).
  Trainer writes; the linked client reads their own. `client_id` makes package and payment creates
  safe to retry; attendance is one record per client per day (upsert).
- **Today (trainer).** One call, `GET /today`: who trained, who attended, who is slipping, pending
  requests and the biggest dues (a fixed number of queries however many clients). `GET /dues` lists
  every client who owes money for the client list badges.
- **Trainer app.** New Today tab, client list with last logged, slipping flag and dues badge (search
  and filters unchanged), and one client screen with sections: Overview, Workouts, Diet, Weight,
  Attendance, Fees, Profile (replaces tabs inside tabs). Sell package, record payment, delete,
  month calendar for attendance, one-tap WhatsApp reminder built on the device with the trainer's
  UPI id (`PUT /trainers/me/discovery {upi_id}`; never in discovery results). Trainers log for clients
  who never install through the Overview quick log and attendance.
- **Client app.** Today card (logged today, streak, week, diet days), quick log per sport, shortcuts
  to history, meals, weight, attendance and fees, rate coach (kept), Play review prompt once after
  the 4th logged workout (`expo-store-review`, approved in this phase).
- **Other.** Roster adherence gained `last_activity_date` and `trained_today` (additive). Deleting a
  client now also deletes their packages, payments and attendance. `RouterConfig` can raise rate
  limits for tests. `tsconfig.json` now lists `"types": ["jest", "node"]` because TypeScript 6 no
  longer loads `@types/*` automatically.

API additions: `GET /today`, `GET /dues`, `GET /fees/:trainee_id`, `POST /fees/:trainee_id/packages`,
`POST /fees/:trainee_id/payments`, `DELETE /packages/:id`, `DELETE /payments/:id`,
`GET /attendance/:trainee_id?from&to`, `PUT|DELETE /attendance/:trainee_id/:date`.

Known gaps carried forward:
- The three replaced screens (`DashboardScreen`, `ClientHomeScreen`, `TraineeDetailScreen`) are
  still on disk, unused, until the owner confirms deletion (see owner-todo section 6).
- No package editing (delete and re-sell), no per-session price, no invoices or receipts.
- Client list dues and last-logged cover active clients only (inactive clients show neither).
- Marking attendance does not check that a package exists or has sessions left.

Suggested commit messages:
```
Phase 5 (backend): packages, payments, attendance, dues and Today overview

- Models, repositories, services, controllers and routes for fees and attendance
- Money in whole paise; due = packages minus payments; idempotent creates via client_id
- GET /today and GET /dues in a fixed number of queries
- Trainer upi_id; last_activity_date and trained_today on adherence
- Client delete cascades packages, payments and attendance
- Unit and HTTP integration tests
```
```
Phase 5 (app): Today screens, client sections, fees, attendance, WhatsApp reminder

- Trainer Today, client list with last logged, slipping and dues
- Client record as sections (overview, workouts, diet, weight, attendance, fees, profile)
- Sell package, record payment, UPI id, one-tap WhatsApp reminder
- Client Today card, quick log, shortcuts, Play review prompt after 4th workout
- Jest tests for money, reminder text, calendar, last logged, review rule
```

