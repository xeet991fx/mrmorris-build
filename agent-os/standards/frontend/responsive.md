## Responsive Design Best Practices - mrmorris Application

### Breakpoint System
- **Mobile**: `< 640px` (default, mobile-first)
- **Tablet**: `sm: 640px` - Small tablets and large phones
- **Desktop**: `md: 768px` - Tablets and small laptops
- **Large Desktop**: `lg: 1024px` - Standard desktop screens
- **Extra Large**: `xl: 1280px` - Large desktop monitors
- **2XL Container**: `2xl: 1400px` - Maximum container width

### Mobile-First Development
- **Write Mobile Styles First**: Start with mobile layout, then progressively enhance with `sm:`, `md:`, `lg:` prefixes
- **Touch Targets**: Ensure interactive elements are minimum 44x44px for touch usability (buttons, links, form inputs)
- **Mobile Navigation**: Use responsive navigation patterns (hamburger menus, bottom navigation)
- **Viewport Meta**: Next.js automatically includes proper viewport meta tags

### Application-Specific Responsive Patterns

#### Dashboard & Admin Panels
- **Sidebar Layout**: 
  - Mobile: Collapsed sidebar with toggle button
  - Desktop: Expanded sidebar (use `lg:` breakpoint)
- **Data Tables**: 
  - Mobile: Card view with key information
  - Desktop: Full table with all columns
- **Stats Grid**:
  - Mobile: 1 column (`grid-cols-1`)
  - Tablet: 2 columns (`sm:grid-cols-2`)
  - Desktop: 3-4 columns (`lg:grid-cols-3` or `lg:grid-cols-4`)

#### Forms
- **Field Layout**:
  - Mobile: 1 column, full width inputs
  - Desktop: 2 column grid for related fields (`lg:grid-cols-2`)
- **Labels**: Stack labels above inputs on mobile, consider inline on desktop for space efficiency
- **Form Actions**: Full-width buttons on mobile, auto-width on desktop

#### ID Cards & Print Media
- **Screen Display**: Responsive preview that scales to viewport
- **Print Media**: Fixed dimensions using `@media print` (3in x 2in for ID cards)
- **Download/Print**: Maintain exact dimensions regardless of screen size

### Fluid Layouts & Units
- **Container Widths**: Use `container` class (max-width: 1400px, centered, with 2rem padding)
- **Spacing**: Use Tailwind spacing scale (`p-4`, `gap-6`, etc.) for consistency
- **Font Sizes**: Use responsive text utilities (`text-sm`, `lg:text-base`) or `rem` units
- **Relative Units**: Prefer `rem` over `px` for accessibility and scalability

### Testing Requirements
- **Test All Breakpoints**: Verify layouts at 375px (mobile), 768px (tablet), 1024px (desktop), 1440px (large desktop)
- **Chrome DevTools**: Use responsive design mode to test different screen sizes
- **Real Devices**: Test on actual mobile devices when possible, especially for touch interactions
- **Print Preview**: Test ID card printing using browser print preview

### Content Priority
- **Mobile**: Show critical information first (participant name, ID, key actions)
- **Progressive Disclosure**: Use tabs, accordions, or expandable sections for secondary content on mobile
- **Desktop**: Can show more data simultaneously in multi-column layouts

### Performance on Mobile
- **Image Optimization**: Use `next/image` with responsive image props (fill, sizes)
- **Code Splitting**: Next.js automatically code-splits routes for faster mobile loading
- **Font Loading**: Fonts are optimized via `next/font` (Inter, Hanken Grotesk)
- **Minimize Large Dependencies**: Lazy load heavy components (charts, rich editors) using `next/dynamic`

### Common Responsive Patterns
```tsx
// Grid that adapts to screen size
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Responsive padding
<div className="p-4 md:p-6 lg:p-8">

// Responsive text
<h1 className="text-2xl md:text-3xl lg:text-4xl">

// Conditional display
<div className="hidden lg:block"> {/* Desktop only */}
<div className="lg:hidden"> {/* Mobile only */}
```

