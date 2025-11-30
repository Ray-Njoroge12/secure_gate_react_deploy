# SecureGate Visual Design Specifications
## Minute Detail Documentation

**Document Version:** 1.0  
**Last Updated:** November 26, 2025

---

## 1. Color Specifications

### 1.1 Complete Color Palette with Exact Values

#### Primary Brand Colors
| Color Name | Hex | RGB | HSL | Usage |
|------------|-----|-----|-----|-------|
| Brand Primary | #10B981 | rgb(16, 185, 129) | hsl(160, 84%, 39%) | Primary CTAs, success states |
| Brand Primary Hover | #059669 | rgb(5, 150, 105) | hsl(160, 94%, 30%) | Button hovers |
| Brand Secondary | #3B82F6 | rgb(59, 130, 246) | hsl(217, 91%, 60%) | Links, informational |

#### Neutral Grays
| Color Name | Hex | RGB | Usage |
|------------|-----|-----|-------|
| Gray 50 | #F9FAFB | rgb(249, 250, 251) | Page backgrounds |
| Gray 100 | #F3F4F6 | rgb(243, 244, 246) | Tertiary surfaces |
| Gray 200 | #E5E7EB | rgb(229, 231, 235) | Borders |
| Gray 300 | #D1D5DB | rgb(209, 213, 219) | Strong borders |
| Gray 400 | #9CA3AF | rgb(156, 163, 175) | Muted text |
| Gray 500 | #6B7280 | rgb(107, 114, 128) | Tertiary text |
| Gray 600 | #4B5563 | rgb(75, 85, 99) | Secondary text |
| Gray 900 | #111827 | rgb(17, 24, 39) | Primary text |

#### Semantic Colors
| Semantic | Default | Light | Dark | Background |
|----------|---------|-------|------|------------|
| Success | #10B981 | #D1FAE5 | #059669 | #ECFDF5 |
| Error | #EF4444 | #FEE2E2 | #DC2626 | #FEF2F2 |
| Warning | #F59E0B | #FEF3C7 | #D97706 | #FFFBEB |
| Info | #3B82F6 | #DBEAFE | #2563EB | #EFF6FF |

### 1.2 Color Usage Rules

1. **Primary Actions**: Always use Brand Primary (#10B981)
2. **Secondary Actions**: Use slate-700 (#334155) or outlined style
3. **Destructive Actions**: Use Error red (#EF4444)
4. **Informational**: Use Info blue (#3B82F6)
5. **Backgrounds**: Never use pure white (#FFFFFF) for page backgrounds - use Gray 50 (#F9FAFB)
6. **Text on colored backgrounds**: Ensure minimum 4.5:1 contrast ratio

---

## 2. Typography Specifications

### 2.1 Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
  'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
  sans-serif;
```

### 2.2 Size Scale (rem to px)

| Token | rem | px | Usage |
|-------|-----|-----|-------|
| xs | 0.75rem | 12px | Timestamps, metadata |
| sm | 0.875rem | 14px | Labels, helper text |
| base | 1rem | 16px | Body text |
| lg | 1.125rem | 18px | Emphasized body |
| xl | 1.25rem | 20px | Subheadings |
| 2xl | 1.5rem | 24px | Card titles |
| 3xl | 1.875rem | 30px | Section titles |
| 4xl | 2.25rem | 36px | Page titles |
| 5xl | 3rem | 48px | Hero text |

### 2.3 Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Normal | 400 | Body text |
| Medium | 500 | Labels, emphasized |
| Semibold | 600 | Headings h3-h6 |
| Bold | 700 | Headings h1-h2 |

### 2.4 Line Heights

| Token | Value | Usage |
|-------|-------|-------|
| tight | 1.25 | Headlines |
| snug | 1.375 | Subheadings |
| normal | 1.5 | UI elements |
| relaxed | 1.625 | Body paragraphs |
| loose | 2.0 | Large text blocks |

---

## 3. Spacing Specifications

### 3.1 Spacing Scale

| Token | rem | px | Usage |
|-------|-----|-----|-------|
| xs | 0.25rem | 4px | Icon gaps, tight margins |
| sm | 0.5rem | 8px | Button padding, list item spacing |
| md | 1rem | 16px | Card padding, standard margins |
| lg | 1.5rem | 24px | Section spacing |
| xl | 2rem | 32px | Major section breaks |
| 2xl | 3rem | 48px | Page sections |
| 3xl | 4rem | 64px | Hero sections |

### 3.2 Component Spacing

| Component | Internal Padding | External Margin |
|-----------|------------------|-----------------|
| Button (sm) | 6px 12px | - |
| Button (md) | 8px 16px | - |
| Button (lg) | 12px 24px | - |
| Card | 24px | 16px |
| Input | 12px 16px | 8px (label to input) |
| Modal | 24px | - |
| Section | - | 48px (between sections) |

---

## 4. Border Radius

| Token | rem | px | Usage |
|-------|-----|-----|-------|
| sm | 0.25rem | 4px | Badges, tags |
| md | 0.375rem | 6px | Buttons (default) |
| lg | 0.5rem | 8px | Inputs, cards |
| xl | 0.75rem | 12px | Large cards |
| 2xl | 1rem | 16px | Modals |
| full | 9999px | - | Pills, avatars |

---

## 5. Shadow Specifications

### 5.1 Shadow Scale

| Token | Value | Usage |
|-------|-------|-------|
| sm | 0 1px 2px 0 rgba(0,0,0,0.05) | Subtle elevation |
| md | 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06) | Cards |
| lg | 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05) | Modals |
| xl | 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04) | Dropdowns |

### 5.2 Focus Shadows

```css
/* Focus ring for inputs */
box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);

/* Focus ring for buttons */
box-shadow: 0 0 0 2px var(--color-bg-primary),
            0 0 0 4px var(--color-brand-primary);
```

---

## 6. Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| dropdown | 1000 | Dropdowns, popovers |
| sticky | 1020 | Sticky headers |
| fixed | 1030 | Fixed elements |
| modal-backdrop | 1040 | Modal overlay |
| modal | 1050 | Modal content |
| popover | 1060 | Popovers |
| tooltip | 1070 | Tooltips |

---

## 7. Transition Specifications

### 7.1 Timing

| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| fast | 150ms | ease-in-out | Hover states |
| base | 200ms | ease-in-out | Standard transitions |
| slow | 300ms | ease-in-out | Page transitions |

### 7.2 Transition Properties

```css
/* Button transitions */
transition: background-color 200ms ease-in-out,
            box-shadow 200ms ease-in-out,
            transform 200ms ease-in-out;

/* Input transitions */
transition: border-color 200ms ease-in-out,
            box-shadow 200ms ease-in-out;

/* Card transitions */
transition: box-shadow 200ms ease-in-out;
```

---

## 8. Component Dimensions

### 8.1 Interactive Elements

| Element | Height | Min Width | Touch Target |
|---------|--------|-----------|--------------|
| Button (sm) | 36px | 64px | 44x44px |
| Button (md) | 44px | 80px | 44x44px |
| Button (lg) | 56px | 96px | 56x56px |
| Input | 44px | 200px | 44px height |
| Checkbox | 16x16px | - | 24x24px (padded) |
| Radio | 16x16px | - | 24x24px (padded) |
| Toggle | 24x44px | - | 44x44px |

### 8.2 Layout Elements

| Element | Width | Height |
|---------|-------|--------|
| Sidebar | 256px (w-64) | Full height |
| Topbar | Full width | 64px (h-16) |
| Card (min) | 280px | Auto |
| Modal (sm) | 400px | Auto |
| Modal (md) | 560px | Auto |
| Modal (lg) | 720px | Auto |

---

## 9. Icon Specifications

### 9.1 Icon Sizes

| Size | px | Usage |
|------|-----|-------|
| xs | 12px | Inline with small text |
| sm | 16px | Inline with body text |
| md | 20px | Buttons, navigation |
| lg | 24px | Card headers |
| xl | 32px | Feature icons |
| 2xl | 48px | Empty states |

### 9.2 Icon Stroke Width

```css
/* Standard stroke width */
stroke-width: 2px;

/* Thinner for small icons */
stroke-width: 1.5px; /* for 12-16px icons */
```

---

## 10. Responsive Breakpoints

| Breakpoint | Min Width | Target Devices |
|------------|-----------|----------------|
| sm | 640px | Mobile landscape |
| md | 768px | Tablets |
| lg | 1024px | Laptops |
| xl | 1280px | Desktops |
| 2xl | 1536px | Large screens |

### 10.1 Container Max Widths

| Breakpoint | Max Width |
|------------|-----------|
| sm | 640px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |
| 2xl | 1536px |

---

## 11. Animation Keyframes

### 11.1 Fade In

```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 11.2 Slide In Up

```css
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 11.3 Spin (Loading)

```css
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

### 11.4 Pulse

```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

---

## 12. Status Color System

### 12.1 Visitor Status Colors

| Status | Background | Text | Border |
|--------|------------|------|--------|
| Pending | #FEF3C7 (amber-100) | #92400E (amber-800) | #FCD34D (amber-300) |
| Approved | #D1FAE5 (green-100) | #065F46 (green-800) | #6EE7B7 (green-300) |
| Checked In | #DBEAFE (blue-100) | #1E40AF (blue-800) | #93C5FD (blue-300) |
| Checked Out | #E5E7EB (gray-200) | #374151 (gray-700) | #9CA3AF (gray-400) |
| Denied | #FEE2E2 (red-100) | #991B1B (red-800) | #FCA5A5 (red-300) |
| Expired | #F3F4F6 (gray-100) | #4B5563 (gray-600) | #D1D5DB (gray-300) |

### 12.2 Badge Sizes

| Size | Padding | Font Size | Border Radius |
|------|---------|-----------|---------------|
| sm | 2px 8px | 12px | 4px |
| md | 4px 12px | 14px | 6px |
| lg | 6px 16px | 16px | 8px |

---

## 13. Form Field Specifications

### 13.1 Input States

| State | Border Color | Background | Shadow |
|-------|--------------|------------|--------|
| Default | #E5E7EB | #FFFFFF | none |
| Hover | #D1D5DB | #FFFFFF | none |
| Focus | #10B981 | #FFFFFF | 0 0 0 3px rgba(16,185,129,0.1) |
| Error | #EF4444 | #FFFFFF | 0 0 0 3px rgba(239,68,68,0.1) |
| Disabled | #E5E7EB | #F9FAFB | none |

### 13.2 Label Specifications

```css
font-size: 14px;
font-weight: 500;
color: #4B5563;
margin-bottom: 8px;
```

### 13.3 Helper Text

```css
font-size: 14px;
color: #6B7280;
margin-top: 4px;
```

### 13.4 Error Text

```css
font-size: 14px;
color: #EF4444;
margin-top: 4px;
```

---

## 14. Mobile-Specific Adjustments

### 14.1 Touch Adjustments

- All interactive elements have minimum 44x44px touch target
- Increased spacing between tap targets on mobile
- Bottom navigation replaces sidebar on mobile

### 14.2 Typography on Mobile

| Desktop Size | Mobile Size |
|--------------|-------------|
| 36px (4xl) | 30px (3xl) |
| 30px (3xl) | 24px (2xl) |
| 24px (2xl) | 20px (xl) |

---

## 15. Print Styles

```css
@media print {
  body {
    background-color: white;
    color: black;
  }
  
  /* Hide non-essential elements */
  .sidebar, .topbar, .fab, .toast {
    display: none !important;
  }
  
  /* Optimize for printing */
  a[href]:after {
    content: " (" attr(href) ")";
  }
}
```

---

*This document should be used in conjunction with the design system CSS files and component library for consistent implementation across the application.*
