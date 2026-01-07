## UI Component Best Practices - mrmorris Application

### Next.js 15 App Router Patterns
- **Server vs Client Components**: Default to Server Components; use `'use client'` directive only when needed (state, effects, browser APIs, event handlers)
- **File Organization**: 
  - Pages: `app/[route]/page.tsx`
  - Layouts: `app/[route]/layout.tsx`
  - Reusable components: `components/[category]/[component-name].tsx`
  - API routes: `app/api/[route]/route.ts`
- **Data Fetching**: Use async Server Components for data fetching; avoid `useEffect` for initial data loads

### shadcn/ui Component System
- **Component Library**: Use shadcn/ui components from `components/ui/` directory (Button, Dialog, Select, Tabs, etc.)
- **Customization**: Customize shadcn components by editing the source files directly - they're part of your codebase
- **Composition**: Build complex UIs by composing shadcn primitives (e.g., Dialog + Form + Button)
- **variants Pattern**: Use `class-variance-authority` (cva) for component variants, following shadcn conventions

### Application-Specific Components
- **Form Components**: Use `react-hook-form` with `zod` validation for all forms
- **Data Tables**: Use consistent table patterns with sorting, filtering, and pagination
- **Dashboard Cards**: Use `.stat-card` or `.premium-card` utilities for consistent card styling
- **Charts**: Use `recharts` or `chart.js` via `react-chartjs-2` for data visualization

### Component Architecture
- **Single Responsibility**: Each component should have one clear purpose (e.g., `IDCard`, `QRCodeScanner`, `ParticipantForm`)
- **Prop Interface**: Define explicit TypeScript interfaces for all props
- **Default Props**: Provide sensible defaults using TypeScript default parameters
- **Children Pattern**: Use `children` prop for composition when appropriate

### State Management
- **Local State**: Use `useState` for component-local state
- **Global State**: Use Zustand stores (in `store/` directory) for shared state
- **Form State**: Use `react-hook-form` for form state management
- **Server State**: Use Next.js Server Components and Server Actions for data mutations

### Naming Conventions
- **Component Files**: PascalCase with `.tsx` extension (e.g., `ParticipantCard.tsx`)
- **Hooks**: Prefix with `use` (e.g., `useParticipant.ts` in `hooks/` directory)
- **Utils**: camelCase for utility functions in `lib/` directory
- **Types**: Define in `types/` directory or co-located with components

### Performance Best Practices
- **Code Splitting**: Leverage Next.js automatic code splitting
- **Dynamic Imports**: Use `next/dynamic` for heavy components (e.g., charts, editors)
- **Image Optimization**: Always use `next/image` for images
- **Memoization**: Use `React.memo`, `useMemo`, `useCallback` judiciously for expensive operations

### Reusability Guidelines
- **Extract Common Patterns**: If a pattern appears 3+ times, extract it into a reusable component
- **Configurable Props**: Make components flexible via props (variants, sizes, colors)
- **Slot Pattern**: Use composition slots for flexible layouts (header, content, footer)
- **Shared Components**: Place truly reusable components in `components/shared/`

### Documentation
- **TypeScript as Documentation**: Use detailed TypeScript types - they serve as living documentation
- **JSDoc Comments**: Add JSDoc for complex component APIs or non-obvious behavior
- **Example Usage**: For shared components, add usage examples in comments

