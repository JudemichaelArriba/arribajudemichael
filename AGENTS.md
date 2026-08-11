# AI Agent Instructions for arribajudemichael Portfolio

## Project Overview
**Name:** arribajudemichael  
**Type:** Personal Portfolio Website  
**Tech Stack:** Next.js 16.2.12 (App Router), React 19, TypeScript 5, Tailwind CSS 4, GSAP 3.15, Three.js 0.185  
**Owner:** Jude Michael Arriba - Full-Stack Software Engineer

## Critical Framework Information
<!-- BEGIN:nextjs-agent-rules -->
### Next.js Version Notice
This project uses **Next.js 16.2.12** with the App Router. This version may have breaking changes from your training data:
- App Router conventions (not Pages Router)
- React Server Components by default
- New routing, layouts, and data fetching patterns
- **Always check `node_modules/next/dist/docs/` before implementing features**
- **Respect deprecation warnings and use current APIs**
<!-- END:nextjs-agent-rules -->

## Project Structure

```
arribajudemichael/
├── app/                          # Next.js App Router directory
│   ├── (public)/                 # Route group for public pages
│   │   ├── layout.tsx            # Public layout with Preloader + Navbar + Footer
│   │   └── page.tsx              # Home page composition
│   ├── layout.tsx                # Root layout with fonts and metadata
│   ├── globals.css               # Global styles, Tailwind directives, scrollbar styles
│   └── favicon.ico               # Site favicon
├── components/
│   ├── sections/                 # Page sections and page-level section scenes
│   │   ├── home/                 # Hero section with FloatingLines effect
│   │   │   └── Home.tsx          # Uses Tailwind CSS (no CSS module)
│   │   ├── WhatIDo/              # What I Do section
│   │   │   └── WhatIDo.tsx       # Tailwind CSS only
│   │   ├── AboutMe/              # About section with compact bento/profile layout
│   │   │   ├── AboutMe.tsx       # Tailwind CSS only
│   │   │   └── AboutBento.tsx    # Thin wrapper around shared Bento UI
│   │   ├── Experience/           # Replayable timeline section
│   │   │   └── Experience.tsx
│   │   ├── TechStack/            # Categorized technology grid
│   │   │   └── TechStack.tsx     # Unframed icon/name lists + reversible scrubbed per-tech reveal
│   │   ├── Projects/             # Dynamic projects and certificates showcase
│   │   │   └── Projects.tsx      # Supabase DTOs + PDF.js previews + replayable GSAP reveal
│   │   └── Contact/              # Static contact form + contact channel presentation
│   │       └── Contact.tsx       # Tailwind UI + replayable GSAP reveal
│   ├── ui/                       # Reusable UI components
│   │   ├── Button.tsx            # Custom button with specular/magnetic variants
│   │   ├── navigationStyles.ts   # Shared Navbar/Footer link underline animation
│   │   ├── RollingText.tsx       # Animated text roller component
│   │   ├── ScrollFloat/          # Scroll-triggered float animation
│   │   │   └── ScrollFloat.tsx   # Uses Tailwind CSS (no CSS module)
│   │   ├── CertificatePdfPreview/ # Lazy PDF.js page-one canvas renderer
│   │   │   └── CertificatePdfPreview.tsx
│   │   ├── LineSidebar/          # Proximity-based sidebar navigation
│   │   │   ├── LineSidebar.tsx
│   │   │   └── LineSidebar.module.css  # Custom CSS variables (keep native CSS)
│   │   └── TiltedCard/           # Interactive profile/card tilt effect
│   │       ├── TiltedCard.tsx
│   │       └── TiltedCard.css    # 3D tilt/overlay styles (keep native CSS)
│   ├── navbar/                   # Navigation
│   │   ├── Navbar.tsx            # Main navigation bar
│   │   └── Navbar.module.css     # Complex transitions (keep native CSS)
│   ├── loader/                   # Loading components
│   │   ├── Preloader.tsx         # Page preloader wrapper
│   │   └── PreloaderLogo.tsx
│   ├── footer/                   # Semantic public-site footer
│   │   └── Footer.tsx            # Server-rendered navigation + contact placeholders
│   └── effects/                  # Visual effects
│       ├── Magnet/               # Magnetic hover effect
│       │   └── Magnet.tsx
│       ├── SpecularButton/       # Specular light button effect
│       │   ├── SpecularButton.tsx
│       │   └── SpecularButton.css  # Canvas effects (keep native CSS)
│       └── FloatingLines/        # WebGL hero background (Three.js)
│           ├── FloatingLines.tsx
│           └── three.d.ts        # Local Three.js declarations used by the effect
├── lib/
│   ├── fonts.ts                  # Font configurations (Bricolage Grotesque)
│   ├── site.ts                   # Shared typed navigation and contact configuration
│   ├── useActiveSection.ts       # Hook for active section detection
│   └── animations/
│       ├── useRoleCycle.ts       # Text role cycling animation
│       └── preloader.ts          # Preloader animation logic
├── public/                       # Static assets
│   ├── profile.jpeg              # About/profile image
│   ├── tech/                     # Locally hosted original-color technology SVGs
│   ├── projectsTemporary/        # Temporary static project screenshots
│   ├── certsTemporary/           # Retained legacy certificate assets (unused by live UI)
│   ├── vendor/pdfjs/             # Generated worker/WASM assets (gitignored)
│   ├── *.svg                     # SVG icons
│   └── [fonts if any]
└── Configuration files:
    ├── next.config.ts            # Next.js configuration
    ├── tsconfig.json             # TypeScript config
    ├── eslint.config.mjs         # ESLint setup
    ├── postcss.config.mjs        # PostCSS config
    ├── .env                      # Environment variables (DO NOT READ/EXPOSE)
    └── .env.example              # Environment template
```

## Key Technical Patterns

### 1. Routing & Layouts
- **App Router** with route groups: `(public)` group for public-facing pages
- Root layout (`app/layout.tsx`): Sets up fonts, metadata, HTML structure
- Public layout (`app/(public)/layout.tsx`): Mounts the analytics bootstrap/tracker/batcher, wraps pages with Preloader and Navbar, then renders the semantic Footer after `<main>`
- Homepage order: `Home` -> `WhatIDo` -> `AboutMe` -> `Experience` -> `TechStack` -> `Projects` -> `Contact`
- Client components marked with `'use client'` directive

### 2. Component Architecture
- **Server Components by default** (Next.js 16 App Router)
- Client components explicitly marked with `'use client'`
- Dynamic imports for heavy components (e.g., FloatingLines with `ssr: false`)
- Component co-location: styles next to component files
- Projects and Certificates are read from Supabase on the server and passed as serializable DTOs into the existing animated public showcase. Fetch them independently so one failed query does not hide the other view.
- Certificate data access lives in `features/admin/certificates/`: public reads are published-only and cached with the `certificates` tag; admin reads are authenticated and uncached; mutations use authenticated Server Actions and invalidate both public and admin views.
- Certificate PDFs are the single source of truth. Authenticated browsers upload directly to the public `certificate-files` bucket at `certificates/<uuid>/certificate.pdf`; actions accept metadata only, derive and verify canonical paths, and never trust a browser-supplied deletion path.
- `CertificatePdfPreview` lazily renders page 1 with `pdfjs-dist`, caps DPR at 2, and cleans up rendering resources. Worker and WASM files are copied locally into ignored `public/vendor/pdfjs/` assets before development and production builds; do not use a CDN or generate duplicate preview images.
- Navigation and public contact destinations are centralized in `lib/site.ts`; empty contact URLs must render as non-interactive content, never empty anchors.
- The Contact form is a static client-side preview until Supabase integration. Keep field names stable and do not imply that submissions were delivered or persisted.

### 3. Analytics Architecture
- Public analytics orchestration lives in `components/analytics/`: `AnalyticsSessionBootstrap.tsx` observes throttled interaction and refreshes the anonymous session, `AnalyticsEngagementTracker.tsx` owns section visibility/dwell state, and `AnalyticsEngagementBatcher.tsx` sends buffered deltas about every 30 seconds plus best-effort hidden/pagehide flushes.
- `features/analytics/` owns the shared limits/activity signal, client delta buffer, server-only visitor/session persistence, and authentication/enable checks. Visitor and session UUIDs are generated and validated on the server and remain in `HttpOnly`, `SameSite=Lax`, path `/` cookies; the visitor cookie lasts one year and session activity expires after approximately 30 minutes without meaningful browser interaction.
- Session bootstrap uses a same-origin Web Lock when the browser supports it to reduce concurrent-tab requests, while the server-only `get_or_create_analytics_session` RPC is the final atomic reuse-or-create guarantee.
- `POST /api/analytics/session` is the only public session bootstrap route. `POST /api/analytics/engagement` is the only application engagement-write boundary and accepts a bounded batch UUID plus section deltas only; it never accepts visitor/session IDs from the browser, validates cookie ownership server-side, rate-limits before the privileged write, and invokes `record_analytics_engagement_idempotent` through `lib/supabase/system.ts`.
- Public analytics writes are server-mediated. Client Components must never import the system Supabase client, read `SUPABASE_SECRET_KEY`, or query/write analytics tables directly. The system client is restricted to trusted server-only ingestion code; Admin reporting uses the authenticated cookie client, reporting RPCs, and RLS.
- Analytics rate limits use persistent Upstash state with analytics-specific prefixes. Source identification is an HMAC of a trusted platform IP using `CONTACT_IP_HASH_SECRET`; raw IPs and source hashes are never stored in analytics tables or returned to clients.
- Only explicitly marked `[data-analytics-section]` elements are tracked. `home` is prohibited in the client, API, and database constraints. A section requires at least one second of meaningful visibility, hidden tabs pause timing, and inactivity pauses visible-time accumulation.
- Engagement buffering follows snapshot -> assign one random batch UUID -> send or retry that same batch -> acknowledge the exact snapshot on HTTP 204. Only one batch may be pending/in flight; newer deltas keep accumulating separately and must never be merged into or moved with an assigned batch. The idempotent RPC returning `false` means the batch was already processed and is still success. Batch UUIDs must be reused for uncertain retries and must never be transferred between analytics sessions.
- Admin reporting lives in `features/admin/analytics/{types,queries}.ts`, is server-only, and uses `Asia/Manila` boundaries: local day, Monday-based week, calendar month, and calendar year. `components/admin/analytics/` owns the detailed `/dashboard/analytics` report and Recharts components. `/dashboard` is only the weekly four-card summary plus one compact Visitor Activity chart and a link to the detailed report.
- Traffic RPCs currently attribute visitors and sessions by `analytics_sessions.started_at`. Changing cross-midnight or cross-period attribution requires an owner-managed RPC/schema decision, not a client-side workaround.
- Analytics is non-critical: public failures stay silent, ingestion fails closed without blocking the portfolio, and Admin query failures render explicit unavailable states distinct from valid zero-data states.
- **Database ownership:** the repository owner manually manages Supabase schema, migrations, RPCs, RLS, and indexes. Agents must report database mismatches and must not create, edit, or push analytics database changes unless explicitly directed by the owner.

### 4. Styling Approach
- **Tailwind CSS 4 is mandatory for standard styling** - Use utility classes for layout, spacing, sizing, typography, colors, borders, shadows, responsive states, and simple hover/focus states.
- **Use Tailwind even when a CSS file already exists** - Keep or add native CSS only for rules that Tailwind would make fragile, unreadable, or less correct.
- **Native CSS is protected only when necessary** for:
  - Pseudo-elements, masks, `color-mix`, complex layered backgrounds, or browser-specific selectors
  - Complex state transitions and backdrop layering (e.g., `Navbar.module.css`)
  - Dynamic CSS custom properties and proximity effects (e.g., `LineSidebar.module.css`)
  - WebGL/Canvas containers and generated DOM effects (e.g., `SpecularButton.css`)
  - Effect-only rules in `components/ui/Bento/Bento.css` such as glow variables and border-glow pseudo-elements
- **Protected native CSS files:** `SpecularButton.css`, `Navbar.module.css`, `LineSidebar.module.css`, and effect-only pieces of `components/ui/Bento/Bento.css`.
- CSS Modules (`.module.css`) are for component-specific complex effects only, not ordinary layout or typography.
- Global styles in `app/globals.css` are for Tailwind directives, CSS variables, scrollbar, reduced-motion, and true global utilities.
- Tailwind arbitrary values (`className="text-[#5227FF]"`) are preferred for one-off exact design values.
- Empty or unused CSS files must be removed after conversion.
### 5. Animation & Effects
- **GSAP 3.15** for complex animations (@gsap/react)
- **Three.js/OGL** for WebGL effects such as FloatingLines
- Custom hooks for animation logic (`useRoleCycle`, etc.)
- Performance-focused: animations isolated, lazy-loaded when heavy

### 6. Typography
- **Next Font** optimization for Google Fonts (Geist, Geist Mono)
- Custom fonts loaded via `lib/fonts.ts` (Bricolage Grotesque)
- Font variables applied via CSS custom properties

### 7. UI Components
- **Button component** (`components/ui/Button.tsx`):
  - Variants: `default`, `specular`, `ghost`
  - Sizes: `sm`, `md`, `lg`
  - Features: magnetic hover, glow effects, customizable radius
  - Props: `href`, `variant`, `size`, `radius`, `magnetic`, `magnetPadding`, `glowProximity`
- **RollingText** for animated text transitions
- **Magnet wrapper** for magnetic hover effects on any component
- **CertificatePdfPreview** for lazy client-only PDF page-one previews backed by local PDF.js runtime assets

## Development Guidelines

### Code Style
- **TypeScript** for all new files (`.tsx`, `.ts`)
- Strict typing: avoid `any`, prefer explicit types
- Functional components with hooks (no class components)
- Props interfaces defined for all components
- Descriptive naming: `handleClick`, `isActive`, etc.

### Component Patterns
```typescript
// Client component template (Tailwind CSS)
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
      {/* Use Tailwind utility classes */}
    </div>
  );
}
```

```typescript
// Component with complex CSS (only when necessary)
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
      {/* Use CSS Module only for complex effects that Tailwind can't handle */}
    </div>
  );
}
```

### File Naming
- Components: PascalCase (`Button.tsx`, `HomePage.tsx`)
- Utilities/hooks: camelCase (`useActiveSection.ts`, `fonts.ts`)
- Styles: match component name (`Button.module.css`, `globals.css`)
- Route segments: lowercase (`(public)`, `page.tsx`)

### Performance Optimization
- Use `dynamic()` with `ssr: false` for client-only heavy components
- Lazy-load effects and animations
- Optimize images via Next.js Image component
- Code-split large dependencies

### Animation Best Practices
- Use GSAP for timeline-based animations
- Prefer CSS transforms over layout properties
- Use `will-change` sparingly
- Clean up animations in useEffect return
- Replayable reveals restart on `onEnter` and reset only on `onLeaveBack`; reuse paused timelines and never recreate them during scroll
- Test performance on lower-end devices

## Content & Brand

### Brand Identity
- **Name:** Jude Michael Arriba
- **Role:** Full-Stack Software Engineer
- **Specialties:** 
  - Robust Backend APIs
  - Fluid Mobile/Web Clients
  - Scalable System Architecture
  - Performance Optimization
  - Clean, Maintainable Code

### Tone & Voice
- Professional yet approachable
- Technical competency emphasized
- Focus on reliability, performance, scalability
- Engineering excellence and long-term maintainability

### Design Aesthetic
- Modern, clean, minimalist
- Gradient effects (purple/pink tones: #5227FF to #FF9FFC)
- Smooth animations and transitions
- Interactive hover effects (magnetic, specular)
- High contrast, accessible typography

## Common Tasks

### Adding a New Section
1. Create folder in `components/sections/[section-name]/`
2. Create component file and styles
3. Import and add to page in `app/(public)/page.tsx`
4. Add navigation link to `Navbar.tsx`
5. Update `useActiveSection` if needed for scroll detection

### Adding a New UI Component
1. Create in `components/ui/[ComponentName].tsx`
2. Define TypeScript interface for props
3. Use Tailwind utilities for all standard styling; add CSS only for protected complex effects
4. Export and document usage patterns
5. Consider reusability and composition

### Implementing Animations
1. Use GSAP for complex timelines
2. Create custom hook in `lib/animations/` if reusable
3. Ensure cleanup with `useEffect` return
4. Test performance (60fps target)
5. Add reduced-motion support if applicable

### Environment Variables
- Defined in `.env` (gitignored)
- Template in `.env.example`
- Access via `process.env.NEXT_PUBLIC_*` for client-side
- **Never commit `.env` or expose secrets in code**
- Analytics requires server-only `ANALYTICS_ENABLED`, `SUPABASE_SECRET_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `CONTACT_IP_HASH_SECRET`; only the existing Supabase URL/publishable key are public.
- `ANALYTICS_ENABLED=true` enables public collection. Missing privileged/rate-limit configuration must fail closed and must not fall back to anonymous table writes.

## Dependencies Reference

### Core
- `next@16.2.12` - Framework
- `react@19.2.4` - UI library
- `react-dom@19.2.4` - React renderer
- `typescript@5` - Type safety

### Animation & Effects
- `gsap@3.15.0` - Animation library
- `@gsap/react@2.1.2` - GSAP React integration
- `three@0.185.1` - 3D/WebGL library
- `ogl@1.0.11` - Lightweight WebGL library
- `pdfjs-dist@6` - Client-side first-page certificate PDF rendering

### UI & Icons
- `lucide-react@1.27.0` - Icon library
- `tailwindcss@4` - Utility CSS framework
- `@tailwindcss/postcss@4` - Tailwind PostCSS plugin

### Development
- `eslint@9` + `eslint-config-next` - Linting
- `@types/*` - TypeScript definitions

## Testing & Build

### Testing Infrastructure
This project uses **Jest** and **React Testing Library** for unit testing.

#### Commands
```bash
npm run dev      # Development server (localhost:3000)
npm run build    # Production build
npm run start    # Production server
npm run lint     # Run ESLint
npm test         # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
```

#### Test Structure
- Tests are co-located with components in `__tests__/` directories
- **235+ test cases** covering:
  - UI components (Button, RollingText, Magnet, ScrollFloat)
  - Custom hooks (useActiveSection, useRoleCycle)
  - Page sections (Home, WhatIDo)
  - Navigation and layout (Navbar, Preloader)

#### Configuration Files
- `jest.config.ts` - Jest configuration with Next.js 16 support
- `jest.setup.ts` - Test setup with mocks for Next.js, GSAP, observers

#### GitHub Actions CI/CD
Tests run automatically on every push and pull request to all branches:
- Linting with ESLint
- Unit tests with coverage
- Production build verification
- Artifact archiving
- Coverage upload to Codecov (optional)

See `.github/workflows/test.yml` for the complete workflow configuration.

### Before Committing
1. Run `npm run lint` - fix all errors
2. Run `npm test` - ensure tests pass
3. Run `npm run build` - ensure build succeeds
4. Test in browser (dev mode)
5. Check console for warnings/errors
6. Verify responsive design
7. For CSS-to-Tailwind conversions, verify no design changes, preserved reduced-motion behavior, preserved GSAP/query selector hooks, and no stale CSS imports
8. For analytics changes, run `npm run build` and manually verify cookie/session reuse, admin and Home exclusion, hidden/inactive timing, 30-second batching, retry retention, zero/unavailable reporting states, and both Admin charts without mutating the database

## Notes for AI Agents

### What to Check Before Coding
1. **Next.js version compatibility** - Check docs in `node_modules/next/dist/docs/`
2. **Existing patterns** - Review similar components for consistency
3. **Dependencies** - Use installed packages, don't add new ones without asking
4. **File structure** - Follow established organization
5. **TypeScript** - Ensure type safety, no `any` types

### What to Avoid
- Don't use Pages Router patterns (this is App Router)
- Don't mix Server/Client Components carelessly
- Don't ignore TypeScript errors
- Don't add dependencies without discussion
- Don't modify `.env` or expose secrets
- Don't break existing component APIs
- Don't use deprecated Next.js APIs
- Don't create CSS files or CSS Modules for simple styling; use Tailwind instead

### When in Doubt
1. Read the relevant section in this file
2. Check existing code for patterns
3. Verify with Next.js 16 docs
4. Ask for clarification
5. Test thoroughly before finalizing

---

**Last Updated:** 2026-08-12
**Maintained by:** AI Agents working on this project
