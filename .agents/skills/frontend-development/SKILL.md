---
name: frontend-development
description: Build, refactor, debug, and review EventNest's React and TypeScript frontend. Use for feature modules, components, hooks, forms, validation, API integration, styling, accessibility, and frontend tests.
---

# EventNest Frontend Development Skill

## 1. Purpose and authority

Use this skill for all EventNest frontend implementation and refactoring tasks.

EventNest is an event discovery, management, and ticketing platform. The frontend serves two main user groups:

- Attendees discovering events, purchasing tickets, and managing their tickets.
- Organizers managing venues, events, attendees, and event performance.

Read the repository-root `AGENTS.md` before working. This skill supplements it; it does not override project-wide product, security, or architecture decisions in `AGENTS.md`.

The goal is maintainable, modular, reusable code—not the fewest files, the most abstractions, or the fastest possible implementation.

## 2. Technology and library constraints

Use the stack and versions already established in the repository:

- React
- TypeScript, where configured by the project
- Tailwind CSS
- Framer Motion only when animation adds meaningful value
- React Hook Form for form state and submission
- Zod or Yup for schema-based form validation
- shadcn/ui for reusable UI components
- React Icons (`react-icons`) for application icons

### Components and icons

- Check for an existing shadcn/ui component before building a button, dialog, form control, or other common UI primitive. Add the needed shadcn/ui component through the project's established setup when one is missing, then adapt it to the feature.
- Use React Icons for application icons. Do not hand-code SVG markup or create custom SVG components for icons.
- When a shadcn/ui component includes its own internal icon, preserve the component's behavior and accessibility; use React Icons for icons added by EventNest code.

### Form and validation rules

- Use **React Hook Form** for form handling.
- Use **one** schema validation library: Zod or Yup.
- First inspect `package.json` and existing forms to see which validation library the project already uses.
- Reuse the existing choice consistently. Do not install both Zod and Yup.
- Do not introduce Formik, Redux Form, or another form-state library.
- Do not add another validation library for ordinary form validation.
- If neither Zod nor Yup is installed, prefer Zod unless the existing project architecture gives a clear reason to choose Yup; add only the selected library.
- Keep validation schemas close to the feature that owns the form. Share a schema only when the same validation contract is genuinely reused.

Do not introduce a new state-management, routing, data-fetching, component, styling, or utility library without first checking the current project and establishing a concrete need. Prefer existing project capabilities.

## 3. Non-negotiable component size limit

**No component file may exceed 400 lines of code.**

Treat 400 lines as a hard upper limit, not a target. Aim for substantially smaller, focused files—ideally around 250–300 lines or less when practical.

When a component approaches the limit:

1. Identify distinct responsibilities in the component.
2. Check whether existing components can be reused.
3. Extract cohesive UI sections into focused components where that improves clarity.
4. Move reusable stateful behavior or side effects into a well-justified custom hook.
5. Move feature-specific constants, schemas, or types into appropriate nearby files when that improves organization.
6. Keep the parent component responsible for composition rather than moving code merely to satisfy a line count.

Do not split a component into many tiny components with no meaningful responsibility just to get below 400 lines. The result must remain easier to understand and maintain.

Before finishing, check the line count of every changed or newly created component file. If a component file exceeds 400 lines, refactor it before reporting completion.

## 4. Component reuse: inspect before creating

**Before creating any new component, search the repository for an existing component that already provides the required behavior or could be extended.**

Follow this decision process:

1. Search for components with the same or similar purpose.
2. Inspect their props, behavior, styling, dependencies, and current consumers.
3. Decide whether the existing component can be reused as-is.
4. If it needs a modification, identify every important consumer and assess possible regressions.
5. Prefer a backward-compatible extension when it is safe and makes the component more generally useful.
6. If modifying it would introduce feature-specific behavior, break existing consumers, make its API confusing, or create regression risk, create a separate component within the appropriate feature module.
7. Do not duplicate an existing component merely because it is quicker than understanding it.

When modifying a shared component:

- Preserve existing behavior by default.
- Avoid changing existing prop meanings.
- Prefer optional, backward-compatible props when appropriate.
- Update tests for affected behavior.
- Check important existing consumers for regressions.

A component should be shared because it represents genuinely shared UI or behavior—not simply because two pieces of JSX look vaguely similar.

## 5. Architecture: feature-based modules

**Prefer a feature-based, module-oriented architecture: one module owns one feature or cohesive responsibility.**

Keep each feature's implementation together. For example, event discovery code should live in the event-discovery feature rather than being scattered across unrelated global folders.

A possible structure, to adapt to the repository's existing conventions:

```text
src/
├── app/                         # App bootstrap, providers, routing
├── shared/
│   ├── components/              # Truly reusable UI
│   ├── hooks/                   # Truly shared hooks
│   ├── types/                   # Truly global types
│   ├── utils/                   # Truly shared utilities
│   └── api/                     # Shared API client/configuration
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── types/
│   │   └── pages/
│   ├── events/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── types/
│   │   └── pages/
│   ├── venues/
│   ├── tickets/
│   ├── checkout/
│   ├── wishlist/
│   └── organizer-dashboard/
└── ...
```

This is an architectural example, not permission to reorganize the repository wholesale. Inspect the current structure first and follow its established conventions unless there is a clear reason to improve them.

### Module boundaries

- A feature module owns its pages, feature-specific components, hooks, validation schemas, API/service functions, and types.
- Keep feature-specific implementation inside that feature.
- Put code in `shared/` only when it is genuinely used across multiple independent features or represents a true application-wide concern.
- Avoid circular dependencies between features.
- Avoid importing another feature's private internal files. Expose a deliberate public interface when cross-feature reuse is necessary.
- Do not create global folders full of one-off components, hooks, or types.
- Do not create a new abstraction for a single use unless it meaningfully improves separation, testability, or clarity.

## 6. Custom hooks: deliberate reuse, not automatic extraction

Custom hooks should be created intentionally. **Do not create hooks randomly or wrap every block of component logic in a hook.**

Before creating a hook:

1. Search the repository for an existing hook with the same or similar responsibility.
2. Inspect whether it can be reused or safely extended.
3. Check all existing consumers before changing a shared hook.
4. Confirm that the proposed hook has a clear, cohesive responsibility.
5. Confirm that extracting it improves reuse, separation of concerns, or testability.

Create a custom hook when one or more of these apply:

- Stateful logic is reused by multiple components.
- A component contains a cohesive stateful workflow that obscures its UI.
- Side-effect logic needs a clear lifecycle boundary.
- A complex interaction needs isolated tests.
- The hook represents a meaningful feature-level capability.

Do not create a hook when:

- It only renames a one-line expression.
- It wraps a simple calculation that belongs in a normal utility function.
- It is used once and does not improve separation or testability.
- It duplicates an existing hook with a slightly different name.
- It creates an unnecessary layer between a component and a simple operation.

### Hook placement and quality

- Put feature-specific hooks inside the owning feature module.
- Put hooks in `shared/hooks/` only when they are genuinely shared.
- Give each hook one clear responsibility.
- Follow the Rules of Hooks.
- Keep dependency arrays correct; do not silence dependency warnings to hide design problems.
- Clean up subscriptions, listeners, timers, and abortable requests when appropriate.
- Avoid hooks that expose a large, unclear collection of unrelated values and callbacks.
- Prefer clear return shapes and stable behavior.
- Test complex hooks where the existing test setup supports it.

Before finishing, search for duplicate or overlapping hooks and explain why each new hook is justified.

## 7. TypeScript type organization

Keep types close to the code that owns them.

### Feature-specific types

- Place types used only by one feature inside that feature's `types/` directory or near the relevant module.
- Keep component prop types near their component when they are local and simple.
- Keep API request/response types near the feature service or feature contract that uses them.
- Do not move every type into one global `types.ts` file.

### Global types

- Put a type in shared/global types only when it is genuinely used across independent features or represents an application-wide contract.
- Before adding a global type, search for an existing equivalent.
- Do not redefine a shared type in each feature.
- Avoid creating multiple types that represent the same data shape with slightly different names.

### Reuse TypeScript utility types

Before defining a new type, check whether a built-in TypeScript utility type can express the requirement.

Prefer appropriate reuse of:

- `Pick<T, K>`
- `Omit<T, K>`
- `Partial<T>`
- `Required<T>`
- `Readonly<T>`
- `Record<K, V>`
- `Extract<T, U>`
- `Exclude<T, U>`
- `NonNullable<T>`
- `ReturnType<T>`
- `Parameters<T>`
- `Awaited<T>`
- `InstanceType<T>`

Use indexed access types, generics, and `keyof` when they make a type more accurate and reusable.

Do not force a utility type into a situation where it makes the code harder to understand. Define a new type when the domain meaning or structure is genuinely distinct.

Avoid:

- Repeating the same interface in multiple files.
- Using `any` to avoid understanding a type.
- Creating generic abstractions with no real reuse.
- Duplicating backend types blindly when the frontend contract differs.
- Assuming a frontend type provides runtime validation.

## 8. Styling: Tailwind first

**Use Tailwind CSS as the default styling approach. Do not create unnecessary CSS or style files.**

Before creating a CSS, SCSS, or other styling file:

1. Check whether Tailwind utilities can express the required styling.
2. Check whether an existing shared component or design token already solves it.
3. Check whether a reusable Tailwind theme value should be added instead.
4. Create a separate style file only when there is a concrete need that Tailwind cannot reasonably express or when the repository already uses a justified styling convention for that case.

### Tailwind configuration

- Reuse existing Tailwind theme values and conventions.
- When a design value is repeated or represents a project-wide design token, extend the existing Tailwind configuration/theme rather than scattering arbitrary values throughout components.
- Check the installed Tailwind version and its configuration approach before editing it; do not assume a configuration format from another major version.
- Avoid adding duplicate color, spacing, typography, breakpoint, shadow, or radius values.
- Do not modify global theme values in a way that unexpectedly changes unrelated screens.
- Prefer a deliberate design token or shared utility pattern over repeated arbitrary class values.

Do not create a separate stylesheet for every component. Do not use inline styles for ordinary layout or visual styling when Tailwind can handle it.

## 9. Forms and validation

Use React Hook Form with Zod or Yup for forms.

- Reuse the validation library already selected by the project.
- Keep validation schemas near their feature.
- Infer TypeScript form values from the schema when supported by the chosen library.
- Avoid maintaining separate, duplicated definitions for the same form shape when schema inference can provide the type.
- Show useful field-level validation errors.
- Handle server-side validation errors.
- Disable or guard duplicate submissions while a request is pending.
- Preserve entered values after recoverable failures where appropriate.
- Client-side validation improves usability; backend validation remains authoritative.

Do not add another form or validation library without explicit approval.

## 10. API integration and state

- Use the existing API client and feature service conventions.
- Keep API calls out of presentational components when the project has a service layer.
- Follow the actual backend request and response contracts.
- Do not invent endpoints or response shapes.
- Handle loading, success, empty, and error states.
- Prevent stale requests from overwriting newer results.
- Cancel or ignore obsolete requests where appropriate.
- Avoid duplicated server state and unnecessary derived state.
- Do not add a new state-management or data-fetching library without checking the existing approach and justifying the need.

Authentication and authorization must be enforced by the backend. Frontend role checks may control presentation but are not security controls.

## 11. EventNest-specific frontend behavior

Keep interfaces aligned with the v1 product rules in `AGENTS.md`.

### Attendee-facing features may include

- Event discovery and filtering.
- Event details and venue information.
- Checkout and payment status.
- Ticket list and ticket details.
- QR ticket display.
- Wishlists.
- Profile and verification status.

### Organizer-facing features may include

- Organizer dashboard.
- Venue management.
- Event creation and editing.
- Ticket sales and attendee lists.
- Check-in workflows.
- Event performance summaries.

Do not implement unrelated screens or future-scope features unless explicitly requested.

Never show a ticket as paid or issued based solely on a frontend redirect or local success state. Reflect the backend's verified payment and ticket status.

## 12. Accessibility and responsive behavior

- Use semantic HTML.
- Associate labels and form controls.
- Make interactive elements keyboard accessible.
- Provide visible focus indicators.
- Give icon-only controls accessible names.
- Do not communicate status using color alone.
- Provide appropriate alternative text for meaningful images.
- Make layouts work across supported screen sizes.
- Respect reduced-motion preferences for nonessential animation.

## 13. Testing and verification

Use the test framework already configured in the repository.

For meaningful changes, test relevant behavior:

- Component rendering and interactions.
- Loading, empty, and error states.
- Form validation and submission.
- API success and failure behavior.
- Role-dependent presentation.
- Hook behavior when it contains meaningful state or side effects.
- Accessibility-critical interactions.

Before completing the task:

- Run relevant tests, lint checks, and build commands where available.
- Check that no component file exceeds 400 lines.
- Search for existing components and hooks that overlap with newly added ones.
- Check for duplicated types and unnecessary style files.
- Report checks that were not run.

## 14. Required completion report

At the end of a frontend task, report:

1. What user-facing behavior changed.
2. Which feature module owns the implementation.
3. Which files were created, modified, or removed.
4. Whether existing components or hooks were reused, and why any new ones were necessary.
5. Whether any component file approaches or exceeds the 400-line limit.
6. Which validation approach and TypeScript types were reused.
7. Whether Tailwind configuration or styling files changed, and why.
8. Which tests, lint checks, and builds were run, with their results.
9. Assumptions, risks, and follow-up work.

Do not claim that an API integration is complete if the endpoint is mocked, missing, or not verified.

## Frontend quality bar

Build by feature, reuse deliberately, keep components below 400 lines, and make hooks purposeful. Keep types close to their owners, use TypeScript utilities instead of duplicating shapes, and prefer Tailwind over unnecessary style files. The final implementation should be easy for another engineer to navigate, test, and extend without destabilizing existing features.
