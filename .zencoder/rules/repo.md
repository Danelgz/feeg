---
description: Repository Information Overview
alwaysApply: true
---

# mi-web (FEEG) Information

## Summary
**mi-web** (FEEG) is a comprehensive fitness training application built with Next.js and React. It features a Spanish-focused UI (with support for Basque) for managing workout routines, tracking exercises, monitoring body measures, and social interaction through user following and activity feeds. It leverages Firebase for authentication, real-time data synchronization, and cloud storage.

## Structure
- **components/**: Reusable React components (Sidebar, Layout, Header, forms, UI elements).
- **context/**: React Context providers, primarily `UserContext` for state management and cloud sync.
- **data/**: Static data including exercise lists, food lists, and multi-language translations.
- **lib/**: Core library configurations, mainly Firebase initialization and helper functions.
- **pages/**: Next.js Pages Router structure for all application routes (Home, Routines, Exercises, Profile, Statistics, etc.).
- **public/**: Static assets like logos and icons.

## Language & Runtime
**Language**: JavaScript / TypeScript  
**Version**: React 19.2.3, Next.js 16.1.6, TypeScript 5.9.3  
**Build System**: Next.js CLI  
**Package Manager**: npm (package-lock.json present)

## Dependencies
**Main Dependencies**:
- `next`: ^16.1.6
- `react`: 19.2.3
- `firebase`: ^12.9.0

**Development Dependencies**:
- `typescript`: 5.9.3
- `tailwindcss`: ^4 (Installed but unused; inline styles preferred)
- `eslint`: ^9

## Build & Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Main Files & Resources
**Entry Points**:
- `pages/index.js`: Main landing page / activity feed.
- `pages/_app.js`: Global App component with `UserProvider`.
- `context/UserContext.js`: Central state management and sync logic.
- `lib/firebase.js`: Firebase service configuration.

**Configuration**:
- `next.config.js`: Next.js configuration.
- `tsconfig.json`: TypeScript configuration.
- `firestore.rules`: Security rules for Firebase Firestore.

## Testing
No testing framework is currently configured for this project.
