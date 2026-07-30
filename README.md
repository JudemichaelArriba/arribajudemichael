# Jude Michael Arriba - Portfolio

A modern, performant personal portfolio website built with Next.js 16, React 19, and TypeScript, featuring advanced animations and interactive effects.

## Tech Stack

- **Framework:** Next.js 16.2.12 (App Router)
- **UI Library:** React 19
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **Animation:** GSAP 3.15
- **3D/WebGL:** Three.js, OGL
- **Testing:** Jest, React Testing Library
- **CI/CD:** GitHub Actions

## Getting Started

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the portfolio in your browser.

The page auto-updates as you edit files. Start by modifying `app/page.tsx` or components in the `components/` directory.

### Building for Production

```bash
npm run build
npm run start
```

## Testing

This project includes comprehensive unit tests with Jest and React Testing Library.

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Coverage

- **235+ test cases** covering:
  - UI components (Button, RollingText, Magnet, ScrollFloat)
  - Custom hooks (useActiveSection, useRoleCycle)
  - Page sections (Home, WhatIDo)
  - Navigation and layout (Navbar, Preloader)

### Continuous Integration

Tests run automatically on every push and pull request via GitHub Actions:
- ✅ Linting with ESLint
- ✅ Unit tests with coverage
- ✅ Production build verification
- ✅ Artifact archiving

## Code Quality

```bash
# Run linter
npm run lint

# Format code (if configured)
npm run format
```

## Project Structure

```
arribajudemichael/
├── app/                 # Next.js App Router
├── components/          # React components
│   ├── effects/        # Visual effects (Magnet, LightPillar, etc.)
│   ├── sections/       # Page sections (Home, WhatIDo, etc.)
│   ├── ui/             # Reusable UI components
│   ├── navbar/         # Navigation components
│   └── loader/         # Loading components
├── lib/                # Utilities and hooks
├── public/             # Static assets
├── __tests__/          # Test files (co-located with components)
├── jest.config.ts      # Jest configuration
└── jest.setup.ts       # Test setup and mocks
```

## Features

- 🎨 **Modern UI** - Clean, gradient-rich design with smooth animations
- ⚡ **Performance** - Optimized with Next.js and code splitting
- 📱 **Responsive** - Mobile-first design that works on all devices
- ♿ **Accessible** - WCAG compliant with proper ARIA labels
- 🧪 **Well-Tested** - Comprehensive test coverage with Jest
- 🚀 **CI/CD Ready** - Automated testing and deployment

## Documentation

For detailed development guidelines and architecture information, see:
- [`AGENTS.md`](./AGENTS.md) - Complete project documentation for AI agents
- [`CLAUDE.md`](./CLAUDE.md) - Quick reference for Claude AI

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [GSAP Animation](https://gsap.com)

## Deploy on Vercel

Deploy easily on [Vercel](https://vercel.com/new):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/arribajudemichael)

---

**Built with ❤️ by Jude Michael Arriba**
