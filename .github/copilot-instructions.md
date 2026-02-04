# Copilot Instructions for mi-web

## Project Overview
**mi-web** is a Next.js 16 + React 19 fitness training application (FEEG) with Spanish UI. It's a client-side focused app for managing workout routines and exercises with in-memory state management.

**Key Architecture:**
- **Pages** (`pages/`) - Next.js Pages Router (NOT App Router despite being a newer Next.js version)
- **Components** (`components/`) - Reusable React components using inline styles (no CSS files)
- **Data** (`data/`) - Static exercise definitions exported as constants
- **State Management** - Local component state via `useState`, no global state library (Redux, Zustand, etc.)

## Tech Stack & Development
- **Framework**: Next.js 16.1.6, React 19.2.3, TypeScript 5
- **Styling**: Tailwind CSS 4 (installed but currently unused), inline styles used instead
- **Linting**: ESLint 9 with next config
- **Commands**:
  - `npm run dev` - Start dev server (port 3000)
  - `npm run build` - Build for production
  - `npm run start` - Run production build
  - `npm run lint` - Run ESLint

## File Naming & Conventions
- **Components**: Mix of `.jsx` (Sidebar, Layout, Header) and `.js` (ExerciseForm, RoutineForm)
- **Pages**: All `.js` files in `pages/` directory
- **No file extensions in imports**: Components imported as `./components/Layout` not `./components/Layout.jsx`
- **Spanish content**: UI strings in Spanish (e.g., "Bienvenido", "Rutinas", "Ejercicios")

## Component Patterns

### Layout Pattern
All pages wrap content with `<Layout>` component which provides:
- Sidebar navigation with FEEG branding
- 2-column flex layout (sidebar + main content)
- Consistent styling (Arial font, #f0f2f5 background)

Example: [pages/index.js](pages/index.js) - Layout wraps children

### Form & State Pattern
Forms (`RoutineForm`, `ExerciseForm`) use controlled components:
- `useState` for form inputs
- Form submission resets state via `setName("")`, `setExercises([])`
- Inline button styling with `#008CFF` blue accent color
- Child components receive callbacks (`addExercise`, `saveRoutine`) as props

Example: [components/RoutineForm.js](components/RoutineForm.js#L1-L25) - Form with exercise addition

### List Rendering Pattern
Lists render items with conditional display:
- `{items.length === 0 && <p>No hay...</p>}` for empty states
- `.map()` with unique keys (often array index `i` or `id`)
- Item cards with `backgroundColor: "#fff"`, `boxShadow`, `borderRadius: "5px"` styling

Example: [pages/routines.js](pages/routines.js#L22-L40) - Routine list with delete buttons

## Navigation & Routing
- Next.js `<Link>` component used for navigation (not `<a>` tags)
- Route structure: `/`, `/routines`, `/exercises`, `/profile`, `/settings`, `/routines/create`
- Sidebar defines navigation links; keep sync'd when adding new pages

## Data Management
- **Static Data**: `data/exercises.js` exports `exercisesList` - predefined exercises with `id`, `name`, `group`
- **No Persistence**: Routines stored in-memory with `Date.now()` as ID - data lost on page refresh
- **No API/Backend**: This is frontend-only; any backend integration would require creating API routes in `pages/api/`

## Styling Guidelines
- **No TailwindCSS usage** despite being installed - use inline styles exclusively
- **Color scheme**: 
  - Primary: `#008CFF` (blue buttons)
  - Background: `#f0f2f5` (light gray)
  - Surfaces: `#fff` (white cards)
  - Accent: Red for delete actions
- **Common patterns**:
  ```javascript
  style={{
    padding: "10px 20px",
    backgroundColor: "#008CFF",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer"
  }}
  ```

## Critical Patterns for AI Development
1. **Component composition**: Reuse Layout wrapper, pass callbacks for child interactions
2. **State handling**: Manage local state per component, use array spread for immutability (`[...items, newItem]`)
3. **Form patterns**: Always reset state on successful submission
4. **Inline styling**: Never create CSS files, use object notation consistently
5. **Empty states**: Always provide feedback when lists are empty ("No hay...")

## Known Limitations & TODOs
- No data persistence between sessions
- No authentication/user profiles (profile.js page exists but likely incomplete)
- Tailwind CSS unused - can be leveraged for cleaner styling
- No tests or test framework configured

## When Adding Features
- Create pages in `pages/` directory (auto-routed)
- Create reusable components in `components/`
- Keep inline styling consistent with existing color scheme
- Add navigation links to Sidebar if creating new pages
- Use Spanish UI strings for consistency
