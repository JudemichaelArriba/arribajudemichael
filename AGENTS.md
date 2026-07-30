r# AI Agent Instructions for arribajudemichael Portfolio

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
│   ├── (public)/                # Route group for public pages
│   │   ├── layout.tsx          # Public layout with Preloader + Navbar
│   │   └── page.tsx            # Home page (renders Home section)
│   ├── layout.tsx              # Root layout with fonts and metadata
│   ├── globals.css             # Global styles, Tailwind directives, scrollbar styles
│   └── favicon.ico             # Site favicon
├── components/
│   ├── sections/               # Page sections
│   │   ├── home/              # Hero section with LightPillar effect
│   │   │   └── Home.tsx       # Uses Tailwind CSS (no CSS module)
│   │   └── WhatIDo/           # What I Do section
│   │       ├── WhatIDo.tsx
│   │       └── WhatIDo.module.css  # Complex gradients (keep native CSS)
│   ├── ui/                    # Reusable UI components
│   │   ├── Button.tsx        # Custom button with specular/magnetic variants
│   │   ├── RollingText.tsx   # Animated text roller component
│   │   ├── ScrollFloat/      # Scroll-triggered float animation
│   │   │   └── ScrollFloat.tsx  # Uses Tailwind CSS (no CSS module)
│   │   ├── PurpleScrollbar/  # Global scrollbar styles
│   │   │   └── PurpleScrollbar.tsx  # Empty component (styles in globals.css)
│   │   └── LineSidebar/      # Proximity-based sidebar navigation
│   │       ├── LineSidebar.tsx
│   │       └── LineSidebar.module.css  # Custom CSS variables (keep native CSS)
│   ├── navbar/               # Navigation
│   │   ├── Navbar.tsx       # Main navigation bar
│   │   └── Navbar.module.css  # Complex transitions (keep native CSS)
│   ├── loader/              # Loading components
│   │   ├── Preloader.tsx   # Page preloader wrapper
│   │   └── PreloaderLogo.tsx
│   └── effects/             # Visual effects
│       ├── Magnet/         # Magnetic hover effect
│       │   └── Magnet.tsx
│       ├── SpecularButton/ # Specular light button effect
│       │   ├── SpecularButton.tsx
│       │   └── SpecularButton.css  # Canvas effects (keep native CSS)
│       └── LightPillar/    # WebGL light pillar effect (Three.js)
│           ├── LightPillar.jsx
│           └── LightPillar.css  # WebGL container (keep native CSS)
├── lib/
│   ├── fonts.ts              # Font configurations (Bricolage Grotesque)
│   ├── useActiveSection.ts   # Hook for active section detection
│   └── animations/
│       ├── useRoleCycle.ts   # Text role cycling animation
│       └── preloader.ts      # Preloader animation logic
├── public/                   # Static assets
│   ├── *.svg                # SVG icons
│   └── [fonts if any]
└── Configuration files:
    ├── next.config.ts       # Next.js configuration
    ├── tsconfig.json        # TypeScript config
    ├── eslint.config.mjs    # ESLint setup
    ├── postcss.config.mjs   # PostCSS config
    ├── .env                 # Environment variables (DO NOT READ/EXPOSE)
    └── .env.example         # Environment template
```

## Key Technical Patterns

### 1. Routing & Layouts
- **App Router** with route groups: `(public)` group for public-facing pages
- Root layout (`app/layout.tsx`): Sets up fonts, metadata, HTML structure
- Public layout (`app/(public)/layout.tsx`): Wraps pages with Preloader and Navbar
- Client components marked with `'use client'` directive

### 2. Component Architecture
- **Server Components by default** (Next.js 16 App Router)
- Client components explicitly marked with `'use client'`
- Dynamic imports for heavy components (e.g., LightPillar with `ssr: false`)
- Component co-location: styles next to component files

### 3. Styling Approach
- **Tailwind CSS 4 FIRST** - Use Tailwind utility classes for all standard styling
- **Use native CSS ONLY when necessary** for:
  - Complex radial/multi-layer gradients (e.g., WhatIDo section)
  - Complex state transitions and backdrop filters (e.g., Navbar)
  - Dynamic CSS custom properties (e.g., LineSidebar proximity effects)
  - WebGL/Canvas effects (e.g., LightPillar, SpecularButton)
- CSS Modules (`.module.css`) for component-specific complex styles
- Global styles in `app/globals.css` for scrollbar, reduced-motion, and utility classes
- Tailwind arbitrary values (`className="text-[#5227FF]"`) for one-off custom values

### 4. Animation & Effects
- **GSAP 3.15** for complex animations (@gsap/react)
- **Three.js/OGL** for WebGL effects (LightPillar)
- Custom hooks for animation logic (`useRoleCycle`, etc.)
- Performance-focused: animations isolated, lazy-loaded when heavy

### 5. Typography
- **Next Font** optimization for Google Fonts (Geist, Geist Mono)
- Custom fonts loaded via `lib/fonts.ts` (Bricolage Grotesque)
- Font variables applied via CSS custom properties

### 6. UI Components
- **Button component** (`components/ui/Button.tsx`):
  - Variants: `default`, `specular`, `ghost`
  - Sizes: `sm`, `md`, `lg`
  - Features: magnetic hover, glow effects, customizable radius
  - Props: `href`, `variant`, `size`, `radius`, `magnetic`, `magnetPadding`, `glowProximity`
- **RollingText** for animated text transitions
- **Magnet wrapper** for magnetic hover effects on any component

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
3. Use Tailwind utilities + CSS Module if needed for complex styles
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

### When in Doubt
1. Read the relevant section in this file
2. Check existing code for patterns
3. Verify with Next.js 16 docs
4. Ask for clarification
5. Test thoroughly before finalizing

---

**Last Updated:** 2026-07-31  
**Maintained by:** AI Agents working on this project
