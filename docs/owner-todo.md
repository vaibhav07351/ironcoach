# Owner to-do list

Things only you can do (accounts, secrets, consoles, commits). Do them all at the end, in this
order. Each item says why it matters and exactly what to run or click. Claude keeps this file
up to date as phases finish.

Last updated: 2026-10-24 (after Phase 5).

---

## 1. Git (do first)

- [ ] **Untrack the committed binaries** (optional but recommended). They are build output and
  bloat the repo; the new `.gitignore` keeps them out from now on. The files stay on disk.
  ```bash
  cd "/d/Project Apps/ironcoach/ironcoach"
  git rm --cached backend/bin/ironcoach.exe backend/main.exe
  ```
- [ ] **Commit** the work (suggested messages are at the end of each phase in
  `docs/relaunch-plan.md`).
- [ ] **Normalize line endings once**, right after committing, so git stores Go files with LF
  (the CI formatting check expects it), then commit that separately:
  ```bash
  git add --renormalize .
  git commit -m "Normalize line endings (LF for Go files)"
  ```
- [ ] **Push.** The deploy workflow now runs tests first and only deploys if they pass.

## 2. GitHub repository settings

Settings -> Secrets and variables -> Actions.

- [ ] **Secret `USDA_API_KEY`**: free key from https://fdc.nal.usda.gov/api-key-signup.html.
  Without it production uses the heavily rate-limited `DEMO_KEY` and food search fails under load.
- [ ] **Secret `ORACLE_KNOWN_HOSTS`**: pins the server's SSH identity so the deploy cannot be
  tricked into talking to an impostor. From your own machine:
  ```bash
  ssh-keyscan -H <your-oracle-vm-ip>
  ```
  Paste the whole output as the secret value.
- [ ] *(Optional)* **Variables `MIN_APP_VERSION` and `LATEST_APP_VERSION`**: drive the in-app
  "please update" screen. Leave unset until the new app ships (defaults to 1.0.0).

## 3. Server (Oracle VM)

- [x] ~~Backup before Phase 3~~: not needed. The production database was cleared on 2026-10-13
  (fresh start, your decision); there is no data migration.
- [ ] **Nightly backups** (Atlas free tier has none). Claude will write the cron script and the
  restore steps when you are ready; you need to run it on the VM once.
- [ ] **Upgrade the Oracle tenancy to Pay-As-You-Go** (still free within Always Free limits).
  Always Free idle instances can be reclaimed; PAYG accounts are not.
- [ ] **Free uptime monitor**: create a check on https://uptimerobot.com for
  `https://ironcoach.duckdns.org/healthz` (keyword `ok`, every 5 minutes, email alert).

## 4. Google Play Console and Google Cloud (before the new app ships)

These come up in Phase 4/5; listed here so nothing is forgotten.

- [ ] Register the **Play App Signing SHA-1** and the **upload key SHA-1** on the Android OAuth
  client in Google Cloud Console (needed for native Google sign-in in store builds).
- [ ] Publish the **privacy policy** and **account deletion** pages (Claude will write them; you
  enable GitHub Pages) and paste both URLs into Play Console.
- [ ] Fill **Data safety**, **Health apps declaration** and **content rating** using the answers
  Claude prepares.
- [ ] Store listing: title "TrainerNearMe: PT Client Manager", new short and long description and
  screenshots (Claude prepares text).

---

## 5. Phase 4 (app foundation): things only you can do

- [ ] **Install the new dependencies' native code by making a development build.** The new app uses
  native modules (secure storage, Google sign-in) that do not run in Expo Go. From
  `ironcoach/frontend` in PowerShell 5.1:
  ```powershell
  npm install
  npx eas-cli login
  npx eas-cli build --profile development --platform android
  ```
  Install the resulting APK on your phone, then run `npx expo start --dev-client`.
- [ ] **Google sign-in SHA-1 fingerprints.** In Google Cloud Console, on the Android OAuth client
  for `com.vaibhavbhardwaj.ironcoach`, add the SHA-1 of: the EAS upload key
  (`npx eas-cli credentials --platform android`) and, after the first Play upload, the Play App
  Signing key (Play Console, Setup, App signing). Without the second one, sign-in fails only in the
  store build with "not set up for this build".
- [ ] **Publish the legal pages** at `https://<your-github-username>.github.io/privacy`, `/terms` and
  `/delete-account`, or set `EXPO_PUBLIC_LEGAL_BASE_URL` for the production EAS profile to wherever
  you host them. Claude can write the pages on request. The app links to them from sign-in and
  Account.
- [ ] **Set the version gate** (optional): when you release a build that requires the new backend,
  set the GitHub variable `MIN_APP_VERSION` to `1.1.0` so older builds show "Update needed".
- [ ] **Smoke test on the phone** (15 minutes): sign in as a trainer, add a client, create an invite,
  sign in as that client on a second Google account, join, log a workout and a meal, check the
  trainer sees them, leave coach, delete the test accounts.

---

## 6. Phase 5 (v1 screens, fees and attendance): things only you can do

- [ ] **Delete the three replaced screens** (Claude did not delete them without your OK; nothing
  imports them any more). They are tracked in git, but their Phase 4 edits are not committed yet,
  so commit first if you want the Phase 4 versions in history. In PowerShell 5.1:
  ```powershell
  cd "D:\Project Apps\ironcoach\ironcoach\frontend\app\screens"
  Remove-Item DashboardScreen.tsx, ClientHomeScreen.tsx, TraineeDetailScreen.tsx
  ```
- [ ] **Rebuild the development build** because `expo-store-review` (the Play review prompt) is a
  new native module: `npx eas-cli build --profile development --platform android`, then install it.
- [ ] **Test on the phone** (these cannot be checked without a device):
  1. Trainer: Account, then open a client, Fees, "My UPI id for reminders", save your UPI id.
  2. Sell a "2 sessions, 1000 rupees" package, record a 400 rupee payment, tap "Remind on
     WhatsApp": WhatsApp must open with the message. WhatsApp often does not make the `upi://`
     link tappable; the message also contains the UPI id and amount in words, which is the fallback.
  3. Mark attendance on two days: the package shows "Used up"; unmark one: 1 session left.
  4. Client account: the Today card, quick log, Fees and Attendance (read only).
  5. Log a 4th workout as the client: the Play review prompt appears once (it only appears in
     builds installed from Play, so it may not show in a development build).
- [ ] **Privacy policy and Data safety**: fees, payments and attendance are now stored (amounts the
  trainer records, no card or bank details). Tell Claude when you reach the legal pages so the
  policy text and the Data safety answers include "financial information entered by the trainer".
- [ ] **Backend deploy**: the backend adds three MongoDB collections (`packages`, `payments`,
  `attendance`) and their indexes; they are created automatically at startup. No env vars changed.

