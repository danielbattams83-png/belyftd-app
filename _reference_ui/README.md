# UI architecture reference

These files are verbatim copies of the implementation under `src/`. They are
grouped here only to make reuse and comparison easier.

## Horizontal mentor/growth carousel

- `carousel/courses-overview.component.html`
- `carousel/courses-overview.component.scss`
- `carousel/courses-overview.component.ts`

Original paths:

- `src/app/components/courses-overview.component.html`
- `src/app/components/courses-overview.component.scss`
- `src/app/components/courses-overview.component.ts`

The mentor cards are the dynamic cards after the first three growth cards.
Horizontal scrolling and CSS scroll snap live in the SCSS; active-card,
keyboard, wheel, resize, and centered-scroll behavior live in TypeScript.

## Curriculum bento layout

- `curriculum-bento/courses-curriculum.component.html`
- `curriculum-bento/courses-curriculum.component.scss`
- `curriculum-bento/courses-curriculum.component.ts`

Original paths:

- `src/app/components/courses-curriculum.component.html`
- `src/app/components/courses-curriculum.component.scss`
- `src/app/components/courses-curriculum.component.ts`

At desktop widths this becomes a two-column layout with a sticky bento sidebar.
The same component also contains the mobile module carousel.

## Reusable spotlight bento

- `spotlight-bento/spotlight-bento.component.ts`
- `spotlight-bento/spotlight-bento.element.ts`
- `spotlight-bento/spotlight-bento.css`
- `spotlight-bento/spotlight-bento.cards.ts`
- `spotlight-bento/life-lesson.cards.ts`

Original directory: `src/app/components/spotlight-bento/`.

This implementation has no standalone HTML or SCSS file. The Angular wrapper
uses an inline template, the custom element generates card markup in
`spotlight-bento.element.ts`, and its styles are plain CSS.

## Theme and design tokens

- `theme/styles.css`
- `theme/theme-presets.ts`
- `theme/tenant.service.ts`

Original paths:

- `src/styles.css`
- `src/app/models/theme-presets.ts`
- `src/app/services/tenant.service.ts`

This project uses Tailwind CSS v4 through `@import "tailwindcss"` in
`src/styles.css`; it has no `tailwind.config.*`, `styles.scss`, or
`variables.scss`. Global spacing, typography, safe-area, border, accent, and
layer tokens are in `styles.css`. Named palette presets are in
`theme-presets.ts`, and tenant-specific CSS custom properties are applied at
runtime by `tenant.service.ts`.

The dark slate surfaces and glass-like borders are not fully centralized:
their concrete values also live beside the components in the copied carousel
SCSS, curriculum bento SCSS, and spotlight bento CSS.
