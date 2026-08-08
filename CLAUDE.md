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
  (public)/              -> Public pages (wrapped with Preloader + Navbar)
    layout.tsx           -> Public layout
    page.tsx             -> Home page composition
  layout.tsx             -> Root layout (fonts, metadata)
  globals.css            -> Global styles, scrollbar, Tailwind directives

components/
  sections/              -> Page sections and page-level section scenes
    home/                -> Home.tsx (Tailwind CSS only)
    WhatIDo/             -> WhatIDo.tsx (Tailwind CSS only)
    AboutMe/             -> AboutMe.tsx + AboutBento.tsx wrapper
    Experience/          -> Experience.tsx (timeline + replayable GSAP)
    TechStack/           -> TechStack.tsx (unframed icon/name lists + reversible scrubbed GSAP)
    Projects/            -> Projects.tsx + projects.data.ts (static projects/certificates showcase)
  ui/                    -> Reusable UI (Button, RollingText, ScrollFloat, Bento)
    ScrollFloat/         -> ScrollFloat.tsx (Tailwind CSS only)
    LineSidebar/         -> LineSidebar.tsx + .module.css (CSS variables)
    TiltedCard/          -> TiltedCard.tsx + TiltedCard.css (interactive card tilt)
  navbar/                -> Navbar.tsx + .module.css (complex transitions)
  loader/                -> Preloader components
  effects/               -> Visual effects (Magnet, SpecularButton, FloatingLines)

lib/
  fonts.ts               -> Font configurations
  useActiveSection.ts    -> Scroll detection hook
  animations/            -> Animation logic (useRoleCycle, preloader)

public/
  profile.jpeg           -> About/profile image
  tech/                  -> Local original-color technology SVG assets
  projectsTemporary/     -> Temporary project screenshots
  certsTemporary/        -> Certificate PDFs + generated first-page previews
  *.svg                  -> SVG icons
```

#### Key Technical Decisions
- **Server Components by default** - Only add `'use client'` when needed
- **Tailwind CSS 4 FIRST** - Use utility classes for all standard styling
- **Native CSS only when necessary** - Complex gradients, transitions, CSS variables, WebGL effects
- **CSS Modules** (`.module.css`) for component-specific complex styles that Tailwind can't handle
- **Dynamic imports for heavy components** - e.g., `FloatingLines` uses `dynamic(() => import(), { ssr: false })`
- **GSAP for animations** - Complex timelines and interactions
- **Homepage composition** - Home -> WhatIDo -> AboutMe -> Experience -> TechStack -> Projects
- **Three.js/OGL for WebGL** - Advanced visual effects
- **Static showcase boundary** - `projects.data.ts` owns typed temporary content and should remain replaceable by later database data.

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

#### Brand Colors
- Primary gradient: `#5227FF` → `#FF9FFC`
- Use in effects and highlights
- Maintain high contrast for accessibility

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

#### Test Coverage
This project has **235+ test cases** covering:
- UI components (Button, RollingText, Magnet, ScrollFloat)
- Custom hooks (useActiveSection, useRoleCycle)
- Page sections (Home, WhatIDo)
- Navigation and layout (Navbar, Preloader)

Tests are co-located with components in `__tests__/` directories.

#### CI/CD Pipeline
GitHub Actions runs on every push/PR to all branches:
- ✅ Linting
- ✅ Unit tests with coverage
- ✅ Production build
- ✅ Artifact archiving

See `.github/workflows/test.yml` for workflow configuration.

### Security & Best Practices

#### Environment Variables
- Never read or expose `.env` file contents
- Use `process.env.NEXT_PUBLIC_*` for client-side vars
- Template provided in `.env.example`

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
The following components require CSS Modules for complex effects:
- **Navbar.module.css** - Complex state transitions, backdrop filters, overlay animations
- **LineSidebar.module.css** - Dynamic CSS custom properties for proximity effects
- **SpecularButton.css** - Canvas effect styling
- **components/ui/Bento/Bento.css** - Border-glow pseudo-element, glow CSS variables, and generated spotlight effect only

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

**Last Updated:** 2026-07-31  
**Primary Reference:** `AGENTS.md`  
**Purpose:** AI assistant quick reference and context document
