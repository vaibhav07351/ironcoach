# UI/UX redesign plan - TrainerNearMe

Status: waiting for owner go-ahead. Date: 2026-11-01.

Decisions already made by the owner:
- **Direction:** match the brand (navy + gold from the logo and Play Store graphics).
- **Dark mode:** yes, follows the phone's system setting.
- **Font:** add one Google font, Plus Jakarta Sans, for titles and headings.

Design references we follow (see the `apple-design` and `animate-expo` skills): Apple Human
Interface Guidelines, Material 3 (for Android parity), Refactoring UI, Laws of UX.

---

## How it works today

- The app is well built underneath: one theme file (`constants/theme.ts`), shared components
  (Button, Card, TextField, Screen...), and screens use the shared colors almost everywhere
  (only 2 stray hex colors in the whole app).
- But the look is "default": cream background, Georgia serif titles, flat white boxes with a
  thin grey border, buttons that only fade a little when pressed, plain system tab bar.
- No animation or haptics anywhere, although **Reanimated** (the animation library) and
  **expo-haptics** (phone vibration feedback) are already installed.
- Light mode only (`userInterfaceStyle: 'light'`).

## What goes wrong for a new user

1. **First impression does not match the store listing.** The Play Store graphics promise a
   bold navy-and-gold app; the user opens a cream page with a serif title. It feels like a
   different product.
2. **No visual hierarchy.** Everything is the same white box with the same weight, so the eye
   does not know where to look first (for example on Today, "who is slipping" looks as
   important as "trained today").
3. **Feels static.** Taps give almost no feedback, nothing moves, nothing confirms success.
   Apple's first rule: respond instantly on touch-down.
4. **No dark mode**, which many users now expect, and the app glares at night in a gym.
5. Small gaps: loading is a lone spinner (feels slower than skeleton placeholders), empty
   states are a grey icon and text, people have no avatars (rows are just names).

## How it will work

### Layer 1: design foundation (one place, every screen benefits)

- **Color tokens rebuilt as two palettes (light + dark)** with *semantic* names (what the
  color is *for*, not what it looks like): `bg`, `surface`, `surfaceRaised`, `text`,
  `textSecondary`, `brand` (navy), `accent` (gold), `onAccent`, `success`, `danger`,
  `warning`, `separator`. Gold is reserved for the single most important action on a screen.
- **ThemeProvider + `useTheme()` hook**: screens get the palette for the current light/dark
  setting. Each file's `StyleSheet.create({...})` becomes `makeStyles(colors)`, memoized so
  styles are only rebuilt when the theme changes (no per-render cost).
- **Type scale** following Apple's typography rules: Plus Jakarta Sans for display, title and
  heading (tight negative letter-spacing on large text), system font for body (best
  readability). Adds `largeTitle` (34) and `number` (for stats, tabular digits). Respects the
  phone's text-size setting, with a sensible cap so layouts do not break.
- **Elevation tokens** (soft shadow levels 0-3) replace hairline borders in light mode; in
  dark mode, raised surfaces get lighter instead (shadows are invisible on dark).
- **Motion tokens**: one default spring (no bounce) and one "momentum" spring, standard
  durations, all disabled or turned into fades when the phone has "reduce motion" on.
- **Spacing**: add `xxl` (48) and a 4pt grid rule; fix the ~30 hardcoded paddings.

### Layer 2: core components (redesigned once, used everywhere)

| Component | Change |
|---|---|
| Button | Gold primary for the main CTA, navy secondary, press = quick scale-down spring + light haptic, loading keeps the button width (no jump) |
| Card | Rounded 20, soft shadow, press scale; optional accent stripe for status |
| TextField | Filled style, gold focus ring that animates in, inline error with icon |
| Chip / SectionTabs | Sliding pill indicator that follows the selected tab |
| EmptyState | Big tinted icon circle, friendlier copy, clear action |
| LoadingState | **Skeletons** (grey placeholder shapes that shimmer) instead of a spinner |
| Toast | Styled to the theme, with success/error icons and haptic |
| Tab bar | Filled icon when active, gold active tint, haptic on switch, themed |
| New: `Avatar` | Initials in a colored circle (color derived from the name), photo if present |
| New: `HeroHeader` | Navy header block with greeting and stat tiles, for home screens |
| New: `StatTile`, `ListRow`, `SectionHeader`, `Badge` | Consistent rows with avatar, chevron, count badges |

### Layer 3: screens, in order of what a new user sees

1. **Sign in**: full navy screen, logo with a gentle entrance, brand tagline "Find. Train. Get
   stronger.", white "Continue with Google" button, role cards with icons and a clear
   selected state.
2. **Onboarding** (expertise / interests / join coach): step progress dots, big friendly
   titles, chips that animate on select.
3. **Trainer Today / Client Today**: navy hero header with greeting and stat tiles, sections
   ordered by urgency (Slipping in red-tinted cards, Fees due with amount badge), avatars on
   every row, gold "Add client" button.
4. **Clients list, client record, workouts, diet, progress, fees, profile, account**: same
   components applied, chart colors themed, consistent headers.
5. **Small polish**: first-run hints restyled to match, splash/status bar match the theme,
   success haptics on save.

### Real example

Rohit, a trainer in Pune, installs the app from the Play Store at 9 pm. Today he sees a cream
screen with a serif "TrainerNearMe" and a navy button. After: his phone is in dark mode, so he
sees the navy brand screen with the gold logo easing in and a "Continue with Google" button.
He picks "I'm a trainer" (the card lights up gold and the phone gives a soft tick), picks his
expertise chips, and lands on Today: "Good evening, Rohit" on a navy header with three stat
tiles (0 clients). Below it, a friendly empty state with a big icon and one gold button:
"Add your first client". When he later has 12 clients, Slipping shows Rahul S. with an "RS"
avatar and "3 days since last workout" in red.

## Before / After

| Area | Before | After |
|---|---|---|
| Colors | One light palette, cream + navy | Light and dark palettes, navy + gold, semantic names |
| Dark mode | None (forced light) | Follows system setting |
| Fonts | System + Georgia serif titles | Plus Jakarta Sans headings, system body, Apple tracking rules |
| Text size setting | Not considered | Respected, capped to keep layouts intact |
| Buttons | Fade on press, navy primary | Spring scale + haptic, gold primary CTA |
| Cards / rows | Flat white box, hairline border | Rounded, soft elevation, avatars, chevrons |
| Loading | Centered spinner | Skeleton placeholders |
| Empty states | Grey icon + text | Tinted icon circle, clear single action |
| Tab bar | Default system look | Themed, filled active icons, haptic |
| Sign in | Cream page, small logo | Full navy brand screen with entrance motion |
| Home (Today) | Title + plain stat box | Navy hero header, stat tiles, urgency-ordered sections |
| Motion | None | Springs on press, tab indicator, entrances; off with Reduce Motion |
| App behaviour, API, data | - | **Unchanged** (visual and interaction only) |

## Files that change

- `frontend/package.json`: add `@expo-google-fonts/plus-jakarta-sans` (via `npx expo install`).
- `frontend/app.config.js`: `userInterfaceStyle: 'automatic'`, splash colors.
- `frontend/constants/theme.ts`: rebuilt tokens (palettes, type, elevation, motion). May split
  into `constants/theme/` files if it passes ~200 lines.
- New `frontend/app/contexts/ThemeContext.tsx`: provider, `useTheme()`, `useThemedStyles()`.
- `frontend/App.tsx`: theme provider, font loading behind the splash, themed navigation and
  status bar, themed Toast config.
- `frontend/components/*`: all 26 components restyled; new `Avatar`, `HeroHeader`,
  `StatTile`, `ListRow`, `SectionHeader`, `Badge`, `Skeleton`, `PressableScale`.
- `frontend/app/navigation/*Tabs.tsx`, `RootNavigator.tsx`: themed headers and tab bar.
- `frontend/app/screens/*`: all ~40 screens switched to `useThemedStyles`, first-impression
  and home screens redesigned. `TrainerProfileScreen.tsx` (605 lines) split into section
  components while touching it, per the 300-line rule.
- `frontend/__tests__/`: tests for the palette (contrast check: text on every background meets
  WCAG AA 4.5:1) and for the name-to-avatar-color helper.

No backend changes.

## Order of work (one approval, then straight through)

1. Foundation (tokens, theme provider, font) + `npx tsc --noEmit` clean.
2. Core components.
3. Sign in + onboarding.
4. Today screens + tab bar.
5. Every remaining screen (mechanical theme switch + new components).
6. Polish, reduce-motion check, `break-ui` stress test on the list rows and hero header
   (long names, huge counts, empty), `npm run verify`, and a check on web and a narrow 360px
   phone.

## Risks and how to undo

- **Big visual diff (about 70 files).** Behaviour should not change, but layout regressions are
  possible. Mitigation: no logic changes mixed in; I walk each screen's existing controls
  (filters, counts, empty/error states) after switching it. Undo: commit the current state
  before I start; everything is reversible with git.
- **Dark mode on third-party pieces** (`react-native-chart-kit`, date picker, Toast): each gets
  themed explicitly; anything that cannot be themed is listed in the report.
- **Custom font on web and first launch**: fonts load behind the existing splash, so no flash
  of the wrong font; if loading fails, the system font is the fallback (logged, not swallowed).
- **What I cannot verify myself:** how it looks on a real phone. I can run type-check, lint,
  tests and the web build; the owner should open a dev build or Expo on a phone afterwards.
  This goes into `docs/owner-todo.md`.

## Still open

- Nothing blocking. Brand tagline "Find. Train. Get stronger." is taken from the store
  graphics; say if you want different copy.
