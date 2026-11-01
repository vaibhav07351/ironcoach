# Product

<!-- impeccable:product-schema 1 -->

Written from the repo docs (docs/relaunch-plan.md, docs/ui-redesign-plan.md) and the code on
2026-11-02. Facts marked (inferred) were not confirmed by the owner in an interview.

## Platform

android

Expo + React Native app, shipped on Google Play (package `com.vaibhavbhardwaj.ironcoach`). An iOS
bundle id and a web build exist; Android is the primary target (inferred from the Play-first
relaunch plan).

## Users

- **Personal trainers** (primary): manage clients, log their sessions, diet, fees, attendance and
  progress, often on a phone in the gym between sessions.
- **Clients training with a coach**: log their own workouts, meals and weight; their coach follows
  along. A client joins a coach with a single-use invite code.

## Product Purpose

A free client manager for personal trainers: every client, workout and meal in one place, fees and
packages with WhatsApp reminders, and attendance, streaks and progress at a glance. Success: a
trainer runs their whole client book from the app, and clients keep logging between sessions.

## Positioning

Built for independent trainers in India (inferred: rupee fees in paise, UPI settings, WhatsApp
reminders, Asia/Calcutta default zone). Clients do not need the app: the trainer can log for them.

## Capabilities and Constraints

- Google sign-in only; two roles (trainer, client) with server-side access checks.
- Trainer: client list, invites, coach profile, workouts, diet, fees/packages, attendance, progress.
- Client: today status, quick session logging, history, meals, weight, attendance, rate coach.
- Store name "TrainerNearMe: PT Client Manager"; API on a free duckdns host, no paid domain.

## Brand Commitments

- Name: TrainerNearMe. Tagline: "Find. Train. Get stronger."
- Colors from the logo and store graphics: navy #07173D and gold #FDBF27.
- Light mode is the default; dark is opt-in from Account > Appearance (owner decision 2026-11-02:
  the navy/black look felt negative). In light mode navy is text and accents, not big blocks.
- Logo assets in `assets/images/` have the navy background baked in.

## Evidence on Hand

No real users in production yet (relaunch plan, 2026-10-12). No testimonials or usage numbers;
do not invent any.

## Accessibility & Inclusion

WCAG AA contrast on every palette pair (enforced by `__tests__/theme.test.ts`), 48dp touch
targets, honours the phone's text size up to 1.5x and reduce-motion.
