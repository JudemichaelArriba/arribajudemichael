# Claude AI Instructions for arribajudemichael Portfolio

> **Primary Documentation:** See `AGENTS.md` for complete project structure, patterns, and guidelines.

## Quick Context
This is Jude Michael Arriba's personal portfolio website built with Next.js 16.2.12 (App Router), React 19, TypeScript 5, Tailwind CSS 4, and GSAP 3.15. The site showcases full-stack engineering expertise with advanced interactive effects.

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
    TechStack/           -> TechStack.tsx (unframed icon/name lists + reversible scrubbed GSAP)
    Projects/            -> Projects.tsx (dynamic Supabase projects/certificates showcase)
    Contact/             -> Contact.tsx (static form + replayable GSAP reveal)
  ui/                    -> Reusable UI (Button, RollingText, ScrollFloat, Bento, PDF preview, navigation styles)
    CertificatePdfPreview/ -> Lazy PDF.js first-page canvas renderer
    ScrollFloat/         -> ScrollFloat.tsx (Tailwind CSS only)
    LineSidebar/         -> LineSidebar.tsx + .module.css (CSS variables)
    TiltedCard/          -> TiltedCard.tsx + TiltedCard.css (interactive card tilt)
  navbar/                -> Navbar.tsx + .module.css (complex transitions)
  loader/                -> Preloader components
  footer/                -> Footer.tsx (server-rendered navigation and contact placeholders)
  effects/               -> Visual effects (Magnet, SpecularButton, FloatingLines)

lib/
  fonts.ts               -> Font configurations
  site.ts                -> Shared typed navigation and contact destinations
  useActiveSection.ts    -> Scroll detection hook
  animations/            -> Animation logic (useRoleCycle, preloader)

features/
  analytics/             -> Shared limits/activity, client delta state, server session logic
  chat/                  -> AI chat: env, schema, models + fallback, tools, prompt/profile, moderation
  admin/analytics/       -> Authenticated reporting DTOs and server RPC queries

public/
  profile.jpeg           -> About/profile image
  tech/                  -> Local original-color technology SVG assets
  projectsTemporary/     -> Temporary project screenshots
  certsTemporary/        -> Retained legacy certificate assets (unused by live UI)
  vendor/pdfjs/          -> Generated local PDF.js worker/WASM assets (gitignored)
  *.svg                  -> SVG icons
```

#### Key Technical Decisions
- **Server Components by default** - Only add `'use client'` when needed
- **Tailwind CSS 4 FIRST** - Use utility classes for all standard styling
- **Native CSS only when necessary** - Complex gradients, transitions, CSS variables, WebGL effects
- **CSS Modules** (`.module.css`) for component-specific complex styles that Tailwind can't handle
- **Dynamic imports for heavy components** - e.g., `FloatingLines` uses `dynamic(() => import(), { ssr: false })`
- **GSAP for animations** - Complex timelines and interactions
- **Homepage composition** - Home -> WhatIDo -> AboutMe -> Experience -> TechStack -> Projects -> Contact
- **Three.js/OGL for WebGL** - Advanced visual effects
- **Dynamic showcase boundary** - Projects and Certificates are queried independently on the server and passed to the existing animated client showcase as serialized DTOs.
- **Certificate feature boundary** - `features/admin/certificates/` owns generated-type aliases, DTOs, validation, public/admin queries, and authenticated metadata Server Actions.
- **PDF-only credentials** - The authenticated browser uploads directly to `certificate-files/certificates/<uuid>/certificate.pdf`; Server Actions derive and verify that path, and public cards lazily render page 1 through `CertificatePdfPreview`.
- **Local PDF.js runtime** - `pdfjs-dist` worker and WASM assets are synchronized into ignored `public/vendor/pdfjs/` before `dev` and `build`. Never add CDN workers or duplicate preview images.
- **Shared site configuration** - `lib/site.ts` owns navigation and contact destinations used by Navbar, Contact, and Footer.
- **Contact messages are never stored** - `/api/contact` validates, rate-limits, checks bans and Turnstile, then `features/contact/email.ts` emails the message straight to the owner via Resend (`RESEND_API_KEY`, `NOTIFICATION_EMAIL`, `NOTIFICATION_FROM_EMAIL`, server-only). The site tells visitors their message "isn't stored on this site" — do not reintroduce a messages table or persist submissions without changing that notice.
- **GitHub contributions are server-only** - `features/github/contributions.ts` queries GitHub's GraphQL API for `GITHUB_USERNAME` (`lib/site.ts`) with the server-only `GITHUB_CONTRIBUTIONS_TOKEN` (fine-grained, public read-only, no permissions), strictly validates the calendar, and caches it for a day with `unstable_cache` (failures throw so they are never cached). It never throws to callers: a missing token or GitHub failure returns `null` and the About calendar is simply hidden. Only the serialized DTO reaches `GitHubActivity`; never pass the token or call GitHub from client code.

### Chat Safety Boundary
- `/api/chat` is the only way the "Ask" assistant reaches a model. It checks, in order: the `CHAT_ENABLED` kill switch and Zod env validation, same-origin, a 24 KB body cap, hashed-IP Upstash limits, a strict Zod body (≤10 text messages, user ≤1,000 chars), then moderation. Errors are generic `{ code, message }` with no provider, model or stack details.
- `features/chat/respond.ts` is the only AI SDK importer. The fallback chain (Groq gpt-oss-120b → Groq qwen3.8-27b → Cloudflare llama-3.3-70b) moves on only for 429/5xx/timeout before any answer text. Per-model token budgets and reasoning options live in `features/chat/models.ts`; reasoning tokens count against `maxOutputTokens`, and the Groq project caps Qwen at 1,000 output tokens per minute.
- Tools are argument-free reads over the existing cached public queries, which use the publishable key, RLS and published rows only. Never give the chat `lib/supabase/system.ts`, `SUPABASE_SECRET_KEY`, writes, RPCs or free-form queries.
- Moderation is an EN/TL/CEB blocklist, then crisis phrases, then a gpt-oss-20b classifier. If the classifier fails, only short, clean messages pass. Crisis replies are supportive and name no hotlines.
- Model output is redacted by `lib/security/chatOutputFilter.ts` and rendered as plain text with allow-listed links only.
- Chats are never stored, and the overlay says so.
- The assistant is named **Nero** and is always labelled as an AI: overlay label "Nero — AI assistant", subline "Nero is an AI chatbot…", mobile row "Ask Nero · AI", button name "Ask Nero, AI assistant". The prompt forbids claiming to be Jude or a human. The navbar keeps "Ask"; its hover tooltip (`components/chat/AskNavButton.tsx`, rules in `askHint.ts`) shows immediately on hover or keyboard focus, then rests for 20 minutes and comes back until the visitor has opened the chat once; never on touch. Only a timestamp and a "used" flag are kept in `localStorage`, all access guarded.
- The system prompt (`features/chat/prompt.ts`) and profile (`features/chat/profile.ts`) stay server-only. Keep `profile.ts` in sync with the About/What I Do copy.

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
- **Protected native CSS files:** `SpecularButton.css`, `Navbar.module.css`, `LineSidebar.module.css`, and effect-only pieces of `components/ui/Bento/Bento.css`
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

// 3D/WebGL
import { Renderer, Camera, Transform, Mesh } from 'ogl';
import * as THREE from 'three';
```

#### Path Aliases
- `@/` maps to project root
- Use: `import Button from '@/components/ui/Button'`

### Performance Considerations

#### Code Splitting
```typescript
// Heavy components (WebGL, large libraries)
const FloatingLines = dynamic(
  () => import('@/components/effects/FloatingLines/FloatingLines'),
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
- **Title:** Full-Stack Software Engineer
- **Focus:** Backend APIs, Mobile/Web clients, System architecture
- **Values:** Clean code, performance, maintainability, long-term reliability

#### Writing Style
- Professional but approachable
- Technical competency emphasized
- Clear, concise explanations
- Focus on engineering excellence

### Known Patterns in Codebase

#### Button Component
```typescript
<Button
  href="/cv.pdf"
  variant="specular"    // or "default", "ghost"
  size="lg"             // or "sm", "md"
  radius={999}          // Border radius
  magnetic              // Enable magnetic hover
  magnetPadding={15}    // Magnetic effect area
  glowProximity={60}    // Glow effect distance
>
  Download CV
</Button>
```

#### FloatingLines Effect
```typescript
<FloatingLines
  linesGradient={['#e945f5', '#7C3AED', '#760068']}
  lineCount={4}
  bendRadius={8}
  animationSpeed={1}
  bendStrength={-2}
  lineDistance={8}
  interactive={false}
  parallax={false}
/>
```

#### Magnet Wrapper
```typescript
<Magnet padding={20} disabled={false}>
  <button>Hover me</button>
</Magnet>
```

### AI Assistant Guidelines

#### Converted Components (Now Using Tailwind CSS Only)
The following components have been converted from CSS Modules to pure Tailwind CSS:
- **Home.tsx** - Hero section (removed `Home.module.css`)
- **ScrollFloat.tsx** - Scroll animation component (removed `ScrollFloat.module.css`)
- **WhatIDo.tsx** - What I Do section (removed `WhatIDo.module.css`)

#### Components That MUST Keep Native CSS
The following require native CSS for effects Tailwind cannot express:
- **LineSidebar.module.css** - Dynamic CSS custom properties for proximity effects
- **SpecularButton.css** - Canvas effect styling
- **components/ui/Bento/Bento.css** - Border-glow pseudo-element and generated spotlight only
  (glow colour now comes from `--glow-color`; the glow is disabled in the public showcase)
- **app/globals.css** - theme tokens and `[data-theme="dark"] .tech-icon-adaptive`
  (inverts single-colour brand glyphs in dark mode)

`Navbar.tsx` is **pure Tailwind** — there is no `Navbar.module.css`.

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
❌ **Don't convert protected effect CSS (Navbar, LineSidebar, Bento, TiltedCard, SpecularButton) without proving parity**

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
