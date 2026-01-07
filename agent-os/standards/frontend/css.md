## CSS Best Practices - mrmorris Application

### Methodology
- **Tailwind CSS with shadcn/ui**: This project uses Tailwind CSS v3.4 as the primary styling framework with shadcn/ui components
- **HSL CSS Variables**: All colors are defined as HSL values in CSS variables (e.g., `hsl(var(--primary))`) for dynamic theming
- **Design Token System**: Use the established design tokens from `globals.css` - never hardcode colors or spacing values

### Design Tokens & Color System
- **Primary/Brand Color**: Teal (`--primary: 174 84% 40%`) - use for CTAs, links, and primary actions
- **Semantic Colors**: Use `--success`, `--warning`, `--info`, `--destructive` for status indicators
- **Surface Colors**: Use `--card`, `--surface`, `--surface-hover` for elevated components
- **Theme Support**: Always support both light and dark modes - test all UI changes in both themes

### Custom Utility Classes
- **`.premium-card`**: Use for elevated card components with hover effects and shadows
- **`.glass-panel`**: Use for backdrop-blur effects with semi-transparent backgrounds
- **`.stat-card`**: Use for dashboard statistics with hover scale effects
- **Gradient Utilities**: `.gradient-primary`, `.gradient-success`, `.gradient-warning`, `.gradient-info` for vibrant backgrounds

### Typography System
- **Font Families**: 
  - Headings: Inter (`font-heading`)
  - Body: Hanken Grotesk (`font-sans` or `font-body`)
- **Responsive Sizing**: Use established heading sizes (h1: 2rem/2.5rem, h2: 1.5rem, etc.)
- **Custom Features**: Typography uses OpenType features (`cv02`, `cv03`, `cv04`, `cv11`) automatically

### Performance & Optimization
- **Tailwind Purging**: Production builds automatically remove unused styles via Next.js
- **Minimize Custom CSS**: Leverage Tailwind utilities - only add custom CSS for truly unique cases
- **Print Media**: For ID cards and printable content, use `@media print` with specific dimensions (e.g., 3in x 2in for ID cards)

### Component-Specific Patterns
- **ReactFlow**: Custom edge styling with `.react-flow__edge-path` for workflow visualizations
- **CMDK (Command Palette)**: Custom `[cmdk-*]` attribute selectors for command menu styling
- **Custom Scrollbars**: Thin scrollbars with muted colors automatically applied to all scrollable areas

### Best Practices
- **Use `cn()` utility**: Always use the `cn()` helper from `lib/utils` to merge Tailwind classes safely
- **Consistent Radius**: Use `rounded-lg`, `rounded-md`, `rounded-sm` based on `--radius` variable (0.625rem)
- **Avoid Inline Styles**: Prefer Tailwind classes over inline styles except for dynamic values
- **Mobile-First**: Write mobile styles first, then use `sm:`, `md:`, `lg:`, `xl:`, `2xl:` breakpoints

