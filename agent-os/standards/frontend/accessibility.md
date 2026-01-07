## UI Accessibility Best Practices - mrmorris Application

### Semantic HTML Foundation
- **Proper Elements**: Use `<button>` for actions, `<a>` for navigation, `<nav>`, `<main>`, `<header>`, `<footer>` for structure
- **Form Elements**: Use native `<input>`, `<select>`, `<textarea>` with proper types (email, tel, url, date, etc.)
- **Headings Hierarchy**: Maintain logical heading order (h1 → h2 → h3), don't skip levels
- **Lists**: Use `<ul>`, `<ol>`, `<li>` for lists; `<table>` with `<thead>`, `<tbody>`, `<th>` for data tables

### Keyboard Navigation
- **Interactive Elements**: All buttons, links, form fields, and interactive components must be keyboard accessible
- **Tab Order**: Ensure logical tab order matches visual layout (use `tabIndex` sparingly, prefer natural DOM order)
- **Focus Indicators**: Never remove focus outlines without providing custom visible alternatives (Tailwind uses `focus:ring` by default)
- **Keyboard Shortcuts**: 
  - Command palette (Cmd+K / Ctrl+K) must work
  - Modal dialogs must trap focus and support Escape key to close
  - Dropdown menus should support arrow key navigation

### Color Contrast Requirements
- **WCAG AA Standard**: Maintain 4.5:1 contrast ratio for normal text, 3:1 for large text (18pt+)
- **Color Variables**: Test both light and dark themes for sufficient contrast
- **Don't Rely on Color Alone**: Use icons, labels, or patterns alongside color for status indicators (success/warning/error)
- **Link Contrast**: Ensure links are distinguishable from surrounding text (color + underline or sufficient contrast)

### Form Accessibility

#### Labels & Instructions
- **Every Input Needs a Label**: Use `<label htmlFor="inputId">` or shadcn Label component
- **Placeholder ≠ Label**: Never use placeholder as the only label (it disappears on input)
- **Required Fields**: Mark required fields with `required` attribute and visual indicator (asterisk)
- **Error Messages**: Associate error messages with inputs using `aria-describedby`

#### Validation & Feedback
- **Real-time Validation**: Provide clear, specific error messages (not just "Invalid input")
- **Success Feedback**: Confirm successful submissions with clear messaging
- **Focus Management**: On error, focus the first invalid field
- **Error Summary**: For multi-field forms, provide an error summary at the top

### ARIA Usage
- **Use Sparingly**: Semantic HTML is preferred; use ARIA only when needed
- **Common ARIA Patterns**:
  - `aria-label` for icon-only buttons (e.g., `<button aria-label="Close dialog">`)
  - `aria-describedby` for form field hints and errors
  - `role="alert"` for important announcements (toast notifications)
  - `aria-expanded`, `aria-controls` for collapsible sections
- **shadcn/ui**: Most shadcn components have ARIA built-in (dialogs, dropdowns, tabs)

### Application-Specific Patterns

#### Admin Dashboard
- **Data Tables**: Use `role="grid"` for sortable/filterable tables, provide sort direction announcements
- **Loading States**: Use `aria-live="polite"` regions for data updates, skeleton loaders should have `aria-label="Loading"`
- **Infinite Scroll**: Ensure keyboard users can access all content without infinite scrolling blocking

#### Forms & Data Entry
- **Multi-step Forms**: Indicate current step and total steps (`Step 2 of 5`)
- **File Uploads**: Provide clear instructions, file type restrictions, and success/error feedback
- **Date/Time Pickers**: Ensure keyboard navigation works (arrow keys to change dates)
- **Rich Text Editors**: Ensure toolbar buttons have accessible labels

#### Interactive Elements
- **Modals/Dialogs**: Trap focus inside, close on Escape, return focus on close (shadcn Dialog does this)
- **Tooltips**: Ensure tooltip content is accessible on keyboard focus (not just hover)
- **Command Palette**: Provide keyboard shortcuts and ensure screen reader compatibility

### Screen Reader Testing
- **Test Tools**: Use NVDA (Windows) or VoiceOver (Mac) to test critical user flows
- **Critical Flows to Test**:
  - User registration and login
  - Form submissions (participant registration, contact forms)
  - Dashboard navigation
  - Data table interactions
- **Announcements**: Ensure dynamic content changes (loading, errors, success) are announced

### Image & Media Accessibility
- **Alt Text**: All images must have descriptive `alt` text (or `alt=""` for decorative images)
- **Next.js Image**: Use `alt` prop on all `<Image>` components
- **Icons**: Decorative icons should be `aria-hidden="true"`, functional icons need `aria-label`
- **Charts/Graphs**: Provide text alternatives or data tables for complex visualizations

### Print Media Accessibility
- **ID Cards**: Ensure high contrast for printed ID cards (black text on white background)
- **QR Codes**: Ensure QR codes are large enough to scan reliably (minimum 2cm x 2cm recommended)
- **Print Styles**: Test print preview for readability and proper formatting

### Focus Management Best Practices
- **Modals**: Focus first interactive element when opened
- **Form Submission**: On success, focus success message or next logical element
- **Page Navigation**: Manage focus on client-side route transitions (Next.js App Router does this automatically)
- **Skip Links**: Consider adding "Skip to main content" for keyboard users

### Common Accessibility Patterns
```tsx
// Accessible button with icon
<Button aria-label="Delete participant">
  <TrashIcon aria-hidden="true" />
</Button>

// Form field with error
<Label htmlFor="email">Email</Label>
<Input 
  id="email" 
  type="email"
  aria-invalid={errors.email ? "true" : undefined}
  aria-describedby={errors.email ? "email-error" : undefined}
/>
{errors.email && <span id="email-error" role="alert">{errors.email.message}</span>}

// Loading state
<div role="status" aria-live="polite" aria-label="Loading participants">
  Loading...
</div>
```

