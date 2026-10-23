# Claude AI Instructions for arribajudemichael Portfolio

> **Primary Documentation:** See `AGENTS.md` for complete project structure, patterns, and guidelines.

## Quick Context
This is Jude Michael Arriba's personal portfolio website built with Next.js 16.4.2 (App Router), React 19, TypeScript 5, Tailwind CSS 4, and GSAP 3.15. The site showcases full-stack development expertise with advanced interactive effects.

## Critical Information for AI Assistants

### Before Making Any Changes
1. **Read AGENTS.md first** - Contains full project structure and patterns
2. **Check existing code** - Match patterns, naming conventions, and architecture
3. **Verify Next.js 16 compatibility** - This version uses App Router with potential breaking changes
4. **TypeScript strict mode** - All code must be properly typed, no `any` types

### Project Architecture at a Glance

#### File Organization
```
app/
  (public)/              -> Public pages (Preloader + Navbar + semantic Footer)
    layout.tsx           -> Public layout
    page.tsx             -> Home page composition
  api/analytics/         -> Server-only session bootstrap and engagement ingestion
  (protected)/dashboard/analytics/ -> Detailed authenticated analytics report
  layout.tsx             -> Root layout (fonts, metadata)
  globals.css            -> Global styles, scrollbar, Tailwind directives

components/
  analytics/             -> Client session activity, section observer, and delta batcher
  chat/                  -> "Ask" AI overlay: ChatProvider (shortcuts, lazy mount), AskOverlay (useChat + GSAP), helpers
  admin/analytics/       -> Admin report UI, formatting, and Recharts visualizations
  theme/                 -> ThemeProvider.tsx (data-theme store) + ThemeToggle.tsx
  sections/              -> Page sections and page-level section scenes
    home/                -> Home.tsx (stacked hero: name -> role loop -> bottom-anchored Profile 2)
    WhatIDo/             -> WhatIDo.tsx (Tailwind CSS only)
    AboutMe/             -> AboutSection.tsx (server) -> AboutMe.tsx (statement + tags) + GitHubActivity.tsx (contribution calendar)
    Experience/          -> Experience.tsx (minimal stacked list + replayable GSAP)
    TechStack/           -> TechStack.tsx + keyboard/ (R3F 3D keyboard: layout/palette/build/controller/KeyboardCanvas)
    Projects/            -> Projects.tsx shell + ShowcaseTabs/ProjectIndex/CertificateIndex/ShowcaseIndex/ShowcasePreview, useShowcaseMotion + usePreviewSwap (Option A index; no pin)
    Contact/             -> Contact.tsx (static form + replayable GSAP reveal)
  ui/                    -> Reusable UI (PDF preview, cursor, cursor grid, Turnstile, navigation styles)
    CertificatePdfPreview/ -> Lazy PDF.js first-page canvas renderer
  navbar/                -> Navbar.tsx (pure Tailwind)
  loader/                -> Preloader (canvas stage + sr-only progressbar; drawing lives in lib/animations/preloader*)
  footer/                -> Footer.tsx (server-rendered navigation and contact placeholders)

lib/
  fonts.ts               -> Font configurations
  site.ts                -> Shared typed navigation and contact destinations
  useActiveSection.ts    -> Scroll detection hook
  useMediaQuery.ts       -> SSR-safe media query hook; breakpoints.ts holds the shared queries
  techStack.ts           -> Tech Stack names shared by the section, the keyboard and the chat profile
  animations/            -> Preloader (painter, worker, glyphs, holds), primeStagger, resyncAfterRefresh, scrollRestore

features/
  analytics/             -> Shared limits/activity, client delta state, server session logic
  chat/                  -> AI chat: env, schema, models + fallback, records, prompt/profile, moderation
  admin/analytics/       -> Authenticated reporting DTOs and server RPC queries

public/
  profile.jpeg           -> Site icon
  Profile 2.png          -> Hero portrait
  keyboard/              -> Baked studio reflections for the 3D keyboard (environment.png)
  vendor/pdfjs/          -> Generated local PDF.js worker/WASM assets (gitignored)
```

#### Key Technical Decisions
- **Server Components by default** - Only add `'use client'` when needed
- **Tailwind CSS 4 FIRST** - Use utility classes for all standard styling
- **Native CSS only when necessary** - Complex gradients, transitions, CSS variables, WebGL effects
- **CSS Modules** (`.module.css`) for component-specific complex styles that Tailwind can't handle
- **Dynamic imports for heavy components** - e.g., the Tech Stack `KeyboardCanvas` uses `dynamic(() => import(), { ssr: false })`
- **GSAP for animations** - Complex timelines and interactions
- **Homepage composition** - Home -> WhatIDo -> AboutMe -> Experience -> TechStack -> Projects -> Contact
- **Three.js + @react-three/fiber** - the Tech Stack keyboard is the only WebGL on the site
- **Dynamic showcase boundary** - Projects and Certificates are queried independently on the server and passed to the existing animated client showcase as serialized DTOs.
- **Certificate feature boundary** - `features/admin/certificates/` owns generated-type aliases, DTOs, validation, public/admin queries, and authenticated metadata Server Actions.
- **PDF-only credentials** - The authenticated browser uploads directly to `certificate-files/certificates/<uuid>/certificate.pdf`; Server Actions derive and verify that path, and public cards lazily render page 1 through `CertificatePdfPreview`.
- **Local PDF.js runtime** - `pdfjs-dist` worker and WASM assets are synchronized into ignored `public/vendor/pdfjs/` before `dev` and `build`. Never add CDN workers or duplicate preview images.
- **Shared site configuration** - `lib/site.ts` owns navigation and contact destinations used by Navbar, Contact, and Footer.
- **Contact messages are never stored** - `/api/contact` validates, rate-limits, checks bans and Turnstile, then `features/contact/email.ts` emails the message straight to the owner via Resend (`RESEND_API_KEY`, `NOTIFICATION_EMAIL`, `NOTIFICATION_FROM_EMAIL`, server-only). The site tells visitors their message "isn't stored on this site" — do not reintroduce a messages table or persist submissions without changing that notice.
- **3D keyboard (Tech Stack)** - `@react-three/fiber` renders the board on demand (`frameloop="demand"`), lazy-loaded (`next/dynamic`, ssr:false) and built while the preloader holds (see Preloader hold). All three.js mutation lives in `keyboard/controller.ts` (React only wires it). Key legends are painted once as theme-neutral masks (red = glyph, green = dot) and coloured by the keycap shader, so a theme switch only changes colours (`setTheme` in a layout effect, no repaint, no rebuild). Studio reflections come from the baked `public/keyboard/environment.png` (CubeUV, made by `scripts/bake-keyboard-environment.html`) because three's runtime PMREM compiles a GGX shader that takes seconds on Windows; never reintroduce `PMREMGenerator` at runtime. Shaders are pre-compiled with `gl.compileAsync(scene, camera)` (the whole scene: passing the stage separately double-counts lights). DPR is device-sharp but capped by a pixel budget (`pickDpr`). Shadows redraw only when the board moves. Dark page → white board, light page → black board. Physical keys are mirrored only while the section is visible and never inside fields/dialogs (`shouldMirrorKey`); nothing typed is stored or sent, and keys are never `preventDefault`ed.
- **No-WebGL safety** - `KeyboardCanvas` checks WebGL once and wraps the R3F `Canvas` in an error boundary; without WebGL the board is dropped (`onUnavailable`) and the tool chips update the readout directly. A renderer failure must never take the page down.
- **Showcase frames** - the desktop preview frame is 16:10 with a definite size (`CertificatePdfPreview` needs a measurable height); screenshots fill it (`object-cover object-top`); certificate page 1 sits whole on an inset white sheet (`PaperFrame`, never cropped). The contact-sheet cards on phones/tablets are √2 (`aspect-[1.414/1]`). Captions share one grid cell, so switching items never shifts layout. PDF previews share one PDF.js worker and paint one at a time in idle moments, on-screen first.
- **Projects showcase (Option A · Index)** - nothing is pinned or scrubbed, so content of any length works on any screen height (the old pinned card stack overlapped on short screens; don't reintroduce a pin). One layout is rendered at a time via `useMediaQuery(DESKTOP_QUERY)` (`lib/breakpoints.ts`): desktop (≥1024px) is the index — titles as a list beside a sticky preview; hover (80ms intent, fine pointers only), focus, click and ↑/↓/Home/End select; preview visuals mount lazily once wanted and stay mounted. Phones/tablets: projects as full entries (screenshot, title, stack, description, link); certificates as a contact sheet (1 column, 2 from `sm`). The tabs are WAI-ARIA tabs and double as the heading; their size comes from the column width (`calc((100cqi - 2.75rem) / 9.6)`), so both words stay on one line at every width. Motion (`useShowcaseMotion`, `usePreviewSwap`) follows the HyperFrames rules: paused timelines from `fromTo` with explicit start states, transforms/opacity/clip-path only, grouped staggers capped at 0.5s (`ScrollTrigger.batch`), `power3.out` settle / `power3.inOut` wipes. Reveals play on enter or when jumped past and reset only once their element is fully below the screen (replayable). The header is built once; a tab switch rebuilds only the open panel, shows what is already on screen, and re-measures only triggers from the section down. Deferred ScrollTrigger callbacks are wrapped with `context.add(name, fn)` so a revert kills their tweens; `context.add(fn)` would run them immediately.
- **Phone reveals** - where content stacks (phones/tablets), reveals trigger on each element itself (frame, copy, card, panel, field), never on a section top, so they play while on screen.
- **Preloader progress** - the preloader draws the JM outline by real loading progress, then fills it and lifts. Pieces report through `holdPreloader(weight)` in `lib/animations/preloaderHold.ts` (`progress(0–1)`, `release()`): the page itself (weight 1: hydrated, then fonts) and the Tech Stack board (weight 3, registered in a layout effect: set-up, keys row by row, legends, reflections, shaders, first rendered frame; capped at 7s). The JM and the percentage under it are **one canvas drawn off the main thread**: `lib/animations/preloader.worker.ts` paints on an OffscreenCanvas with the shared painter `lib/animations/preloaderCanvas.ts`, so hydration and the keyboard's WebGL stalls never freeze it (where OffscreenCanvas is missing, `startPreloaderCanvas` runs the same painter on the main thread). The worker is created when `Preloader.tsx` loads (`createPreloaderWorker`), before hydration, because the browser needs free main-thread moments to start a worker. Outline and number come from one value in the same frame, so they always match: the letters are traced in writing order (J, then M, overlapping by `STROKE_OVERLAP`, each over its own length) and finish exactly at 100%; the number starts at 1 with the first stroke (never a lone "0%") and reads 100 only on real completion. Pacing follows the real loading rhythm: it chases each progress jump quickly (`CHASE_RATE`), then crawls slowly a little past the real progress while loading waits (`CRAWL_SHARE`, `CRAWL_MIN_SPEED`, capped at 99%) so it never stops dead, and finishes decisively on completion. Don't replace it with an even, time-like pace: that read as rigid and fake. Glyphs are baked vector paths (`preloaderGlyphs.ts`, generated by `scripts/extract-preloader-glyphs.py` from Urbanist Bold and Geist 500) because a worker cannot use page fonts. The reveal (fill, hold, clear) runs in the worker; the curtain fade is a compositor Web Animation (`liftPreloaderCurtain`). A screen-reader `role="progressbar"` mirrors the percentage. While it is up, `isPreloading()` lets streamed sections skip their own `ScrollTrigger.refresh()` (still `sort()`); the preloader's single refresh on completion measures everything. `usePreloaderPhase()` is `intro` → `loading` (first idle after hydration; heavy pieces start here) → `done`.
- **Refresh-safe callbacks** - a `ScrollTrigger.refresh()` rewinds animations with callbacks running and restores them silently, so anything an `onUpdate` drives (keyboard camera, calendar) must also be re-applied via `resyncAfterRefresh(sync)` (`lib/animations/resyncAfterRefresh.ts`).
- **Scroll restoration** - the browser restores a reload's position before the pins exist and lands too high, so `lib/animations/scrollRestore.ts` takes over (`history.scrollRestoration = 'manual'`, position saved on `pagehide` in sessionStorage) and the preloader puts it back after measuring, before the curtain lifts. Reload and back/forward only.
- **Staggered scroll reveals** - a staggered `fromTo` in a scrubbed timeline only renders its first target's start state until the playhead reaches the rest, so everything after it shows fully on a fresh load. Always pass the from-vars through `primeStagger(targets, from)` (`lib/animations/primeStagger.ts`).
- **Keyboard sound** - `keyboard/sound.ts` unlocks one shared AudioContext on the first click/tap/key anywhere (browsers forbid sound before a gesture; scrolling is not one) and reuses one noise buffer. Mouse/pen press keys on pointer-down (instant click); touch presses on tap release. Only presses the visitor makes play a click: scroll-driven presses are always silent (protects visitors' speakers) — don't add sound to them.
- **Home link** - Home is pinned, so `#home` / `scrollIntoView` land where its pin ends (name already gone). The navbar scrolls Home to `top: 0`; other links use the zero-height `#top` anchor in `app/(public)/page.tsx`.
- **Theme swap** - `ThemeProvider` sets `data-theme-switching` for two frames so the thousands of CSS colour transitions never start (globals.css). Don't remove it.
- **Height variants** - `compact` (≥1024px wide, ≤980px tall) tightens the Tech Stack; `short` (≤820px tall) compacts pinned sections. `compact` is declared before `short` so `short` wins. The Tech Stack tool column is capped at the keyboard's left edge (`100vw - 90svh`), so it never runs under the board.
- **Scroll animations** - each section uses `gsap.matchMedia` + scrubbed ScrollTrigger timelines. When passing a conditions object, include an always-true key (`any: 'all'`), otherwise the callback never runs when no condition matches. Streamed sections (Experience, Projects) call `ScrollTrigger.sort()` before `refresh()`. Never put a form behind a scrubbed reveal (Contact's form reveals once). Don't add per-cell/per-item tweens for large lists; drive them with one CSS variable (About calendar `--reveal`).
- **GitHub contributions are server-only** - `features/github/contributions.ts` queries GitHub's GraphQL API for `GITHUB_USERNAME` (`lib/site.ts`) with the server-only `GITHUB_CONTRIBUTIONS_TOKEN` (fine-grained, public read-only, no permissions), strictly validates the calendar, and caches it for a day with `unstable_cache` (failures throw so they are never cached). It never throws to callers: a missing token or GitHub failure returns `null` and the About calendar is simply hidden. Only the serialized DTO reaches `GitHubActivity`; never pass the token or call GitHub from client code.

### Chat Safety Boundary
- `/api/chat` is the only way the "Ask" assistant reaches a model. It checks, in order: the `CHAT_ENABLED` kill switch and Zod env validation, same-origin, a 24 KB body cap, hashed-IP Upstash limits, a strict Zod body (≤10 text messages, user ≤1,000 chars), then moderation. Errors are generic `{ code, message }` with no provider, model or stack details.
- `features/chat/respond.ts` is the only AI SDK importer. The fallback chain (Groq gpt-oss-120b → Groq qwen3.8-27b → Cloudflare llama-3.3-70b) moves on only for 429, 403/404 (model not enabled), 5xx or timeout before any answer text. Per-model token budgets and reasoning options live in `features/chat/models.ts`; reasoning tokens count against `maxOutputTokens`, and the Groq project caps Qwen at 1,000 output tokens per minute. A length-stopped answer ends with a "cut short" note.
- No tools: `features/chat/records.ts` injects the complete published projects, experience and certificates into every request (existing cached public queries: publishable key, RLS, published rows only), so backup models cannot skip a lookup and invent records. "Jump to" sections are matched server-side against real record titles and sent as a `data-sections` part. Never give the chat `lib/supabase/system.ts`, `SUPABASE_SECRET_KEY`, writes, RPCs or free-form queries.
- Moderation is an EN/TL/CEB blocklist, then crisis phrases, then a gpt-oss-20b classifier. If the classifier fails, only short, clean messages pass. Crisis replies are supportive and name no hotlines.
- Model output is redacted by `lib/security/chatOutputFilter.ts` and rendered as plain text with allow-listed links only.
- Chats are never stored, and the overlay says so.
- The assistant is named **Nero** and is always labelled as an AI: overlay label "Nero — AI assistant", subline "Nero is an AI chatbot…", a square "Ask · AI" button in the mobile navbar bar (not in the dropdown), button name "Ask Nero, AI assistant". The prompt forbids claiming to be Jude or a human. The navbar keeps "Ask"; its hover tooltip (`components/chat/AskNavButton.tsx`, rules in `askHint.ts`) shows immediately on hover or keyboard focus, then rests for 20 minutes and comes back until the visitor has opened the chat once; never on touch. Only a timestamp and a "used" flag are kept in `localStorage`, all access guarded.
- The system prompt (`features/chat/prompt.ts`) and profile (`features/chat/profile.ts`) stay server-only. Keep `profile.ts` in sync with the About/What I Do copy; its `PERSONAL` facts (hobbies, base) are chat-only details Jude supplied, and the age is computed per request from `BIRTH_DATE` in Asia/Manila time. Only the age reaches the model, never the birth date.

### Analytics Safety Boundary
- `app/(public)/layout.tsx` mounts three client entry points: `AnalyticsSessionBootstrap` detects throttled interaction and requests or refreshes anonymous cookies, `AnalyticsEngagementTracker` observes only marked sections, and `AnalyticsEngagementBatcher` snapshots and sends deltas approximately every 30 seconds.
- `features/analytics/activity.ts` and `constants.ts` keep the 30-minute inactivity window and payload constraints aligned. `engagement.ts` owns the in-memory additive buffer. `session.ts` and `request.ts` are server-only and own UUID/cookie validation, database session reuse, the enable flag, and Admin exclusion checks.
- `AnalyticsSessionBootstrap` uses Web Locks where available to reduce duplicate same-browser requests; the server-only `get_or_create_analytics_session` RPC provides the database-level atomic reuse-or-create guarantee.
- Visitor/session IDs are server-generated and stored only in `HttpOnly`, `SameSite=Lax`, path `/` cookies. Never add them to browser payloads, UI, logs, URLs, or client storage. Do not add fingerprinting, raw-IP analytics, geolocation, replay, mouse-coordinate, keystroke-content, or user-agent-history collection.
- Track only explicit `data-analytics-section` markers. `home` must stay excluded. Preserve the one-second meaningful-entry qualification, tall-section engagement band, hidden-tab pause, interaction inactivity pause, one view per qualified entry, and leave/re-enter behavior.
- The buffer contract is snapshot -> assign one random batch UUID -> one in-flight POST -> retry the same UUID and immutable snapshot after uncertain failure -> subtract that exact snapshot only after HTTP 204. New activity accumulates separately. A stale or invalid-session batch is discarded rather than moved to another session.
- `/api/analytics/engagement` is the sole public engagement-write boundary. It accepts only `batchId` plus section deltas, validates the `HttpOnly` cookies and session ownership, uses analytics-specific persistent Upstash limits, and calls `record_analytics_engagement_idempotent` through the server-only system client. RPC `false` means the batch was already processed and is a successful outcome. Client Components must never import `lib/supabase/system.ts`, use `SUPABASE_SECRET_KEY`, or directly query or write analytics tables.
- Admin reporting is server-only in `features/admin/analytics/queries.ts`. It calls authenticated reporting RPCs through the cookie client and RLS with fixed `Asia/Manila` boundaries: local today, Monday-based current week, calendar month, and calendar year. `VisitorTrendChart.tsx` and `SectionPerformanceChart.tsx` render DTOs only and must not fetch Supabase data.
- Current traffic RPCs attribute periods using `analytics_sessions.started_at`; do not silently redefine cross-period attribution in client code.
- `/dashboard` stays a weekly summary: four KPI cards, one compact Visitor Activity chart, and a link to `/dashboard/analytics?period=week`. `/dashboard/analytics` owns Today/Week/Month/Year selection, the full Visitor Traffic chart, Section Performance modes, highlights, and breakdown.
- Analytics failures must never block public rendering or show public error notifications. Public ingestion fails closed; Admin query failures use explicit unavailable states, while real all-zero data uses the normal empty states.
- `ANALYTICS_ENABLED`, `SUPABASE_SECRET_KEY`, Upstash credentials, and `CONTACT_IP_HASH_SECRET` are server-only. The IP-derived HMAC is a rate-limit identifier only and must never enter analytics tables or responses.
- **Database ownership is manual:** Jude Michael Arriba owns Supabase schema, migrations, RPCs, RLS, and indexes. Report mismatches; do not create, edit, or push analytics database changes unless he explicitly requests them.

### Component Patterns to Follow

#### Client Component Template (Tailwind CSS - Preferred)
```typescript
'use client';

import { useState } from 'react';

interface ComponentProps {
  title: string;
  onAction?: () => void;
}

export default function Component({ title, onAction }: ComponentProps) {
  const [state, setState] = useState<string>('');
  
  return (
    <div className="relative flex items-center justify-center p-4">
      {/* Use Tailwind utility classes for all standard styling */}
    </div>
  );
}
```

#### Client Component Template (with Complex CSS - Use only when necessary)
```typescript
'use client';

import { useState } from 'react';
import styles from './Component.module.css';

interface ComponentProps {
  title: string;
  onAction?: () => void;
}

export default function Component({ title, onAction }: ComponentProps) {
  const [state, setState] = useState<string>('');
  
  return (
    <div className={styles.complexGradient}>
      {/* Use CSS Module only for complex effects Tailwind can't handle */}
    </div>
  );
}
```

#### Server Component Template
```typescript
import type { Metadata } from 'next';

interface PageProps {
  params: { slug: string };
}

export const metadata: Metadata = {
  title: 'Page Title',
  description: 'Page description',
};

export default function Page({ params }: PageProps) {
  return (
    <div>
      {/* content */}
    </div>
  );
}
```

### Common Operations

#### Adding a New Section
1. Create `components/sections/[SectionName]/`
2. Add `SectionName.tsx` and optional `.module.css` or `.css`
3. Add `'use client'` if using hooks or animations
4. Import in `app/(public)/page.tsx`
5. Update `Navbar.tsx` with new link

#### Creating a UI Component
1. Create in `components/ui/[ComponentName].tsx`
2. Define TypeScript interface for props
3. **Use Tailwind utilities FIRST** - Only add CSS Module for complex styles Tailwind can't handle
4. Export component with proper typing

#### Implementing Animations
1. Import GSAP: `import gsap from 'gsap'`
2. Use `useGSAP` hook from `@gsap/react` for React integration
3. Create custom hooks in `lib/animations/` for reusable logic
4. Always clean up animations in useEffect return
5. For replayable reveals, reuse paused timelines, restart on `onEnter`, and reset only on `onLeaveBack`
6. **Anything that reveals on mount must wait for the preloader.** `Preloader` covers the viewport
   for ~3.5s and its children mount underneath it, so a mount-time timeline plays and finishes
   before the visitor sees anything. Gate it on `usePreloaderReady()` from
   `@/components/loader/Preloader` and pass the flag through `useGSAP`'s `dependencies`
   (see `components/sections/home/Home.tsx`). Scroll-triggered sections are unaffected.

### Styling Guidelines

#### Tailwind CSS 4 Usage (ALWAYS USE FIRST)
- **Mandatory for all standard styling** - Use utility classes for layout, spacing, sizing, colors, typography, borders, shadows, responsive states, and simple hover/focus states
- **Use Tailwind even when a CSS file exists** - Move safe static CSS into `className`; keep native CSS only when Tailwind would be fragile or unclear
- **Responsive design** - Use `md:`, `lg:`, `xl:` breakpoints
- **Arbitrary values** - Use `text-[#5227FF]`, `p-[clamp(1rem,2vw,3rem)]` for custom values
- **Combine with CSS variables** - `text-[var(--signal)]`, `bg-[var(--surface)]`

#### CSS Modules (USE ONLY WHEN NECESSARY)
- **When Tailwind would reduce safety, readability, or effect correctness:**
  - Pseudo-elements, masks, `color-mix`, generated DOM effects, or complex multi-layer backgrounds
  - Complex state transitions with multiple properties
  - Dynamic CSS custom properties
  - Backdrop filters with complex layering
  - WebGL/Canvas container styles
- The only native CSS today is `app/globals.css` (theme tokens, scrollbar, reduced motion, theme-swap guard)
- **Naming:** `Component.module.css` co-located with component
- **BEM-like naming inside modules:** `.container`, `.button`, `.button__icon`

#### Brand Colors — monochrome, theme-driven
The site is **pure monochrome**: black, white and greys only. There is no accent hue.
Never introduce a coloured accent (the old purple `--signal: #c36dfc` / magenta gradients are gone).

All colour comes from CSS custom properties defined in `app/globals.css`, once for
`:root, [data-theme="light"]` and again for `[data-theme="dark"]`:

`--site-bg`, `--surface`, `--surface-muted`, `--text`, `--muted`, `--faint`, `--signal`
(kept as an alias of `--text`), `--hairline`, `--hairline-soft`, `--hairline-strong`,
`--inverse-bg`, `--inverse-text`, `--field-bg`, `--danger`, `--shadow-card`, `--shadow-lift`.

Rules:
- **Never** write theme-blind utilities in public UI — no `bg-white/[0.04]`, `border-white/10`,
  `bg-black`, `text-white`, `ring-offset-black`, or raw hex. Use the tokens.
- Solid buttons and hover-invert rows use `bg-[var(--inverse-bg)] text-[var(--inverse-text)]`.
- Buttons are **square** (no pill radius).
- GSAP tweens `color` numerically and cannot interpolate `var(...)`; where a colour is animated
  (e.g. `ScrollHighlight` in `WhatIDo`), pass literal hex chosen from `useTheme()`.
- Maintain high contrast for accessibility.

#### Theme system (light default + dark toggle)
- `lib/theme.ts` owns the storage key, the default (`light`), and `THEME_BOOTSTRAP_SCRIPT`,
  an inline no-flash script injected in `app/layout.tsx`'s `<head>`.
- `components/theme/ThemeProvider.tsx` reads `<html data-theme>` through `useSyncExternalStore`
  (a `MutationObserver` subscription) — the document element is the source of truth, so there is
  no `setState` in an effect and no hydration mismatch.
- `components/theme/ThemeToggle.tsx` is the sun/moon segmented control in the navbar (desktop and
  mobile menu).
- Tokens are declared on bare `[data-theme]` selectors, so any subtree can pin a theme.
  `app/(protected)/layout.tsx` and `app/(auth)/layout.tsx` pin `data-theme="dark"` so the admin
  and login areas stay dark regardless of the public toggle.
- No `next-themes`; no new dependency was added.

### Dependencies & Imports

#### Available Packages
```typescript
// React & Next.js
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';

// Animation
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// Icons
import { Download, Menu, X } from 'lucide-react';

// 3D/WebGL (Tech Stack keyboard)
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
```

#### Path Aliases
- `@/` maps to project root
- Use: `import CertificatePdfPreview from '@/components/ui/CertificatePdfPreview/CertificatePdfPreview'`

### Performance Considerations

#### Code Splitting
```typescript
// Heavy components (WebGL, large libraries)
const KeyboardCanvas = dynamic(
  () => import('@/components/sections/TechStack/keyboard/KeyboardCanvas'),
  { ssr: false }
);
```

#### Animation Performance
- Use CSS transforms (translate, scale, rotate)
- Avoid animating layout properties (width, height)
- Use `will-change` sparingly
- Target 60fps minimum

### Testing & Verification

#### Test Commands
```bash
npm test            # Run all tests
npm run test:watch  # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report
```

#### Before Submitting Changes
```bash
npm run lint        # Check for errors
npm test            # Run all tests
npm run test:coverage  # Inspect risk-area coverage
npm run build       # Verify production build
npm run dev         # Test in development
```

#### Manual Checks
- [ ] TypeScript compiles without errors
- [ ] Tests pass (npm test)
- [ ] No console warnings/errors
- [ ] Responsive design works (mobile, tablet, desktop)
- [ ] CSS-to-Tailwind conversions preserve the exact design, reduced-motion behavior, GSAP/query selector hooks, and remove stale CSS imports
- [ ] Animations run smoothly
- [ ] Accessibility maintained (keyboard nav, screen readers)
- [ ] Analytics changes preserve visitor/session reuse, Admin and Home exclusion, inactive/hidden timing, 30-second delta batching, retry retention, Asia/Manila periods, real-data charts, and distinct zero/unavailable states

#### Test Coverage
The Jest + React Testing Library suite is deliberately risk-based rather than count-driven. Tests are co-located with the code they protect in `__tests__/` directories and prioritize:
- Authentication and protected-route authorization
- Contact validation, source identification, rate limiting, bans, Turnstile, and API orchestration
- Projects, Certificates, and Experiences mutation safety
- Analytics session expiry, payload validation, batching, retries, idempotency, and Admin/Home exclusion
- Important user-facing navigation and submit behavior

Do not add tests for Tailwind class strings, exact decorative DOM, GSAP/WebGL/PDF.js internals, or trivial rendering. Mock Supabase, Upstash, Turnstile, and network boundaries; never use production credentials or live data. Coverage is used to find meaningful gaps, not to pursue 100%.

#### CI/CD Pipeline
GitHub Actions runs on every push/PR to all branches:
- Linting
- Unit tests with coverage
- Production build
- Artifact archiving

See `.github/workflows/test.yml` for workflow configuration.

### Security & Best Practices

#### Environment Variables
- Never read or expose `.env` file contents
- Use `process.env.NEXT_PUBLIC_*` for client-side vars
- Template provided in `.env.example`
- Public analytics is enabled only when server-side `ANALYTICS_ENABLED=true`; missing system-client or Upstash configuration must fail closed.

#### Data Safety
- Don't modify `.env`, `.gitignore`, or security configs without explicit permission
- Don't add new dependencies without discussion
- Don't expose API keys or secrets in code/logs

### Brand Voice & Content

#### Jude Michael Arriba's Professional Identity
- **Title:** Full-Stack Developer (web, backend, mobile). Never "Software Engineer" or any engineer title, on the site or in Nero
- **Focus:** Backend APIs, Mobile/Web clients, System architecture
- **Values:** Clean code, performance, maintainability, long-term reliability

#### Writing Style
- Professional but approachable
- Technical competency emphasized
- Clear, concise explanations
- Focus on development excellence

### Known Patterns in Codebase
- Buttons and links are plain Tailwind elements: square, `border-[var(--text)]`, inverting to `bg-[var(--inverse-bg)] text-[var(--inverse-text)]` on hover (see `ShowcaseLink` in `components/sections/Projects/ShowcaseParts.tsx`). There is no shared Button component.
- Section headers share one pattern: a `font-display` kicker, a `data-*-line` hairline that GSAP draws, and a mono counter.

### AI Assistant Guidelines

#### Native CSS
Everything is Tailwind except `app/globals.css` (theme tokens, scrollbar, reduced motion and the
`data-theme-switching` guard). `Navbar.tsx` is pure Tailwind. Unused components, effects and assets
from earlier designs were removed in Oct 2026; don't resurrect them without a design that uses them.

#### What to Do
✅ Read `AGENTS.md` for comprehensive information  
✅ Match existing code patterns and conventions  
✅ Maintain TypeScript strict typing  
✅ Follow Next.js 16 App Router conventions  
✅ Test changes with `npm run build` and `npm run lint`  
✅ Ask for clarification when requirements are unclear  
✅ Consider performance implications  
✅ Maintain accessibility standards  

#### What NOT to Do
❌ Don't use Next.js Pages Router patterns  
❌ Don't add `'use client'` unnecessarily  
❌ Don't use `any` type in TypeScript  
❌ Don't add new dependencies without asking  
❌ Don't modify `.env` or expose secrets  
❌ Don't break existing component APIs  
❌ Don't ignore TypeScript/ESLint errors  
❌ Don't use deprecated Next.js APIs  
❌ **Don't create CSS Modules for simple styling - use Tailwind instead**  

### Quick Reference

#### File Naming
- Components: `PascalCase.tsx`
- Utilities/hooks: `camelCase.ts`
- Styles: `ComponentName.module.css` or `ComponentName.css`
- Routes: `lowercase/page.tsx`

#### Import Order (recommended)
1. React & Next.js imports
2. Third-party libraries
3. Local components
4. Local utilities/hooks
5. Styles
6. Types

#### Git Workflow
- Don't modify `.gitignore` without permission
- Test all changes before committing
- Ensure build succeeds
- Keep commits focused and atomic

---

## For Optimal AI Assistance

When asking for help:
1. **Specify the task clearly** - "Add a contact section" vs "Make it better"
2. **Mention relevant files** - Help the AI focus on the right areas
3. **Provide context** - What are you trying to achieve?
4. **Ask about tradeoffs** - "What's the best way to..." invites discussion

When reviewing AI-generated code:
1. **Check TypeScript types** - Ensure proper typing
2. **Verify imports** - Correct paths and packages
3. **Test build** - Run `npm run build`
4. **Review patterns** - Match existing code style

---

**Last Updated:** 2026-08-12
**Primary Reference:** `AGENTS.md`  
**Purpose:** AI assistant quick reference and context document
