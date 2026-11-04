# Web Design Review and Delivery Guide

Use this guide for source reviews, fixes, and new UI work. Apply only checks relevant to the artifact and distinguish source evidence from measurements.

## Priority and Scope

Classify findings by user impact:

- **Critical**: blocks a core task, creates a serious accessibility barrier, exposes users to a security/privacy risk, or prevents indexing of a page that must be indexed.
- **High**: materially harms accessibility, task completion, mobile use, stability, or performance.
- **Medium**: noticeable usability, compatibility, resilience, or maintainability problem.
- **Low**: polish or optimization with limited user impact.

Do not report a preference as a defect. Respect product requirements, the existing design system, browser support policy, and repository conventions.

## Accessibility

Target WCAG 2.2 Level AA unless the product specifies another standard.

### Structure and Semantics

- Set the document language and use descriptive, unique page titles.
- Prefer native semantic HTML and landmarks (`header`, `nav`, `main`, `aside`, `footer`) before ARIA.
- Use buttons for actions and links for navigation. Do not make a `div` or `span` act like a control when a native element fits.
- Keep heading levels meaningful; do not choose heading tags for visual size alone.
- Provide a skip link when repeated navigation precedes the main content.
- Give data tables proper headers and captions where needed. Do not use tables for page layout.
- Ensure the DOM and reading order remain meaningful when CSS is removed or the layout reflows.

### Names, Alternatives, and Status

- Every control needs an accessible name. Associate labels with form fields; give icon-only controls a specific label.
- Images need useful `alt` text or `alt=""` when decorative. Do not repeat nearby text in `alt`.
- Hide purely decorative icons from assistive technology.
- Provide captions, transcripts, audio descriptions, or equivalent alternatives when the media content requires them.
- Announce meaningful asynchronous status and validation changes with an appropriate live region; avoid noisy announcements.
- Expose programmatic error, required, expanded, selected, disabled, and invalid states where applicable.

### Keyboard and Focus

- All functionality must work with a keyboard and without keyboard traps.
- Native buttons and links already provide keyboard activation; do not add redundant key handlers. Custom widgets must implement the expected keyboard pattern.
- Keep focus order logical. Move or restore focus intentionally for dialogs, menus, and other transient UI.
- Provide a visible `:focus-visible` indicator with sufficient contrast; never remove the outline without an equivalent replacement.
- Ensure sticky regions and overlays do not hide the focused element.
- Provide a non-drag, non-swipe alternative unless the gesture is essential.

### Visual Accessibility

- Meet WCAG contrast requirements: normally 4.5:1 for text, 3:1 for large text, and 3:1 for meaningful UI graphics and component states.
- Do not use color alone to communicate meaning.
- Support text resize to at least 200% without loss of content or function (WCAG 1.4.4).
- Support reflow without loss of information/functionality or two-dimensional scrolling at a viewport equivalent to 320 CSS px wide for vertically scrolling content, or 256 CSS px high for horizontally scrolling content, except where a two-dimensional layout is essential (WCAG 1.4.10). A common desktop test is 400% zoom from a 1280 CSS px-wide viewport.
- Do not disable pinch zoom with `user-scalable=no` or a restrictive `maximum-scale`.
- Keep pointer targets comfortably usable; apply the WCAG 2.2 target-size criteria where relevant.
- Honor `prefers-reduced-motion`; any moving content that persists or starts automatically must have the controls required by WCAG.

Automated checks do not prove accessibility conformance. Where relevant, verify keyboard flow, zoom/reflow, screen-reader names and states, contrast, and error recovery manually.

## Forms and Feedback

- Use the correct input type, meaningful `name`, and appropriate `autocomplete` token. Do not disable autocomplete by default.
- Make labels clickable with `for`/`id` or by wrapping the control. Use `fieldset` and `legend` for related choices.
- Use `inputmode` only as a keyboard hint; keep validation and semantic type correct.
- Never block paste or password managers without a documented, user-centered reason.
- Give instructions before input when the format is constrained; placeholders are not labels.
- Place errors near their fields, identify how to fix them, associate them programmatically, and focus or summarize the first invalid area after submission.
- Prevent duplicate submission while a request is active, preserve entered data after recoverable errors, and communicate success or failure.
- Warn before losing meaningful unsaved work.

## Responsive Layout and Interaction

- Include `<meta name="viewport" content="width=device-width, initial-scale=1">` in standalone pages.
- Start with a layout that works at narrow widths, then enhance for available space. Avoid device-specific assumptions.
- Prefer flexible Grid/Flexbox layouts, relative units, intrinsic sizing, and `min-width: 0` for shrinkable flex/grid children.
- Test representative narrow, medium, and wide viewports, text resize at 200%, and reflow at 320 CSS px (commonly 400% desktop zoom). No essential content or controls may be clipped or require two-dimensional scrolling unless the content has a legitimate WCAG reflow exception.
- Make media responsive while preserving aspect ratio. Use `srcset`, `sizes`, and `picture` when different resolutions or crops add value.
- Do not rely on hover. Provide visible hover, active, focus, loading, disabled, empty, error, and success states as applicable.
- Size touch targets and spacing for coarse pointers. Apply `touch-action` or overscroll rules only when the interaction needs them.
- Account for safe-area insets in edge-to-edge mobile layouts.

## Performance and Lighthouse

### Measurement Contract

- Lighthouse reports lab data. Run it against a representative production build, not a development server when avoidable.
- Record the tested URL, device preset, Lighthouse version, and relevant environment. Run multiple times when results are noisy and compare a representative result.
- Default quality goal: score **90 or higher** in Performance, Accessibility, Best Practices, and SEO. Treat this as a project target, not proof of WCAG conformance, SEO ranking, or real-user performance.
- Do not invent or estimate a score from source review. If Lighthouse was not run, label all score fields `not measured`.
- Prefer field data for Core Web Vitals. Evaluate LCP, INP, and CLS at the 75th percentile, segmented by mobile and desktop when data allows.

Core Web Vitals “good” thresholds:

| Metric | Good | Notes |
| --- | ---: | --- |
| LCP | ≤ 2.5 s | Loading performance |
| INP | ≤ 200 ms | Interaction responsiveness; requires real interaction/field data |
| CLS | ≤ 0.1 | Visual stability |

Lighthouse cannot directly measure INP in a synthetic page load. Use Total Blocking Time (TBT) as the lab responsiveness proxy, while keeping INP as the field metric. Inspect FCP and Speed Index as supporting lab metrics. Lighthouse scoring and weights are versioned; use the values from the generated report rather than freezing weights in this skill.

### Implementation Checks

- Keep critical rendering work small. Remove unused code, split non-critical bundles, defer non-essential scripts, and avoid costly third-party tags.
- Avoid long main-thread tasks and layout thrashing; batch DOM reads and writes and do not force layout during render.
- Reserve media dimensions or an aspect ratio to prevent layout shifts.
- Optimize image format and size; lazy-load below-the-fold media, but do not lazy-load the likely LCP image. Prioritize critical media only when justified.
- Use responsive images instead of serving oversized assets.
- Subset and preload only critical fonts, use an appropriate `font-display`, and avoid unnecessary font variants.
- Animate `transform` and `opacity` where possible. Never use `transition: all`; list intended properties.
- Virtualize or progressively render genuinely large lists when DOM size or rendering cost is material; do not enforce an arbitrary item count without measurement.
- Add preconnect/preload hints only for known critical resources; excessive hints compete for bandwidth.
- Cache versioned static assets and compress text resources at the server/CDN layer when server configuration is in scope.

## Lighthouse Best Practices and Resilience

- Serve production pages and subresources over HTTPS; avoid mixed content.
- Check for console errors, failed resources, deprecated APIs, and browser compatibility problems.
- Add `rel="noopener"` for untrusted new-window links where browser behavior or project support requires it.
- Use a restrictive Content Security Policy when deployment headers are in scope; do not weaken security to make a component work.
- Avoid unsafe HTML injection. Sanitize untrusted content with a proven project-approved approach.
- Trace untrusted data into executable DOM sinks and escape hatches such as `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, string-based `eval`/`Function`/timers, `javascript:` URLs, framework raw-HTML APIs, and server-to-client script interpolation. Prefer safe DOM/text APIs, context-appropriate encoding, sanitization, CSP, and Trusted Types as supported by the project.
- Request powerful permissions only in response to user intent and explain why they are needed.
- Do not expose secrets, personal data, tokens, or source maps containing sensitive material in client bundles.
- Handle network, empty, partial, timeout, and retry states without losing user input.
- Confirm destructive actions or provide a reliable undo path, proportional to consequence.
- Preserve expected browser behavior for links, selection, copy/paste, back/forward navigation, and opening in a new tab.

## SEO and Discoverability

Apply page-level SEO checks only to pages intended for discovery.

- Provide a unique, descriptive `<title>` and a useful meta description.
- Use one clear page topic and a logical heading/content hierarchy; write useful visible content rather than keyword stuffing.
- Ensure important content and links are available in rendered HTML and crawlable without requiring fragile interactions.
- Use descriptive anchor text and valid crawlable URLs.
- Set a canonical URL when duplicate URL variants can exist.
- Verify `robots` directives and `robots.txt` do not accidentally block pages or resources that should be indexed.
- Return appropriate HTTP status codes; provide useful not-found pages and avoid soft 404s.
- Add structured data only when it accurately represents visible content; validate the applicable schema.
- Supply meaningful image alternatives. Use Open Graph or other social metadata only when social previews are in scope.
- Provide hreflang/localized URLs for genuinely localized page variants and keep language metadata consistent.
- Maintain a sitemap for discoverable multi-page sites when site infrastructure is in scope.

Lighthouse SEO covers a baseline set of technical checks, not search ranking or a complete SEO strategy. Do not claim that a high score guarantees discoverability.

## Content, Internationalization, and State

- Use concise, specific labels and actionable error messages. Match the product's voice and capitalization rules instead of imposing one universal style.
- Test empty, loading, error, offline, short, long, localized, and user-generated content.
- Allow text wrapping and expansion; do not rely on truncation when hidden text is essential.
- Use `Intl.DateTimeFormat`, `Intl.NumberFormat`, and locale-aware pluralization for user-facing values.
- Do not infer language from IP alone. Mark content language changes when assistive technology needs them.
- Put shareable navigation state such as filters, tabs, and pagination in the URL when deep linking benefits the user.
- Keep server-rendered and hydrated output deterministic. Suppress hydration warnings only for a known, contained difference.

## Visual Polish, Motion, and Theming

- Use the product's typography and copy conventions. Prefer specific action labels and errors that include a useful next step.
- Use typographic punctuation consistently with the content language. Use non-breaking spaces only where a line break would harm meaning.
- Use `font-variant-numeric: tabular-nums` for columns or counters that must align, and balanced/prettified wrapping where supported and useful.
- Handle very long words, URLs, translations, and user content without breaking the layout. Truncate only when the full value remains available or is non-essential.
- Make animations interruptible and set an intentional `transform-origin`. For transformed SVG artwork, verify the transform box and origin across supported browsers.
- Prefer efficient video to a large animated GIF when motion is necessary; provide a still or reduced-motion alternative.
- For dark themes, set an appropriate `color-scheme`, theme color, and explicit native-control colors where browser defaults would conflict.
- Use `:focus-within` when a compound control needs a unified focus treatment.
- Give anchored headings enough `scroll-margin` to remain visible below sticky navigation.

## Framework-Specific Guidance

For `package.json`, Node-powered Vanilla projects, Angular, React, or mixed JavaScript workspaces, read [`javascript-stacks.md`](javascript-stacks.md) completely. It defines package-manager detection, project boundaries, framework-specific validation, safe server startup, and hybrid-solution coverage.

### Vanilla HTML, CSS, and JavaScript

- This is the default for a standalone component when no framework is requested.
- Keep behavior progressively enhanced: useful markup first, styles second, JavaScript only for required interaction.
- Scope selectors to the component and avoid leaking globals. Use modules only when the surrounding environment supports them.
- Deliver `component-name/index.html`, `style.css`, and `script.js`.

### Angular

- Follow the installed Angular version and the project's standalone or NgModule convention.
- Use Angular template bindings rather than manual DOM mutation. Keep templates semantic and use the framework's current control-flow style only when supported by the project.
- Preserve change-detection and signal/RxJS conventions already established; clean up subscriptions and side effects.
- Default to `component-name/component-name.component.ts`, `.html`, and `.css` (or the project's stylesheet extension).
- Validate the affected Angular project using its configured targets and selected package manager; do not assume a global Angular CLI or a single-project workspace.

### React

- Use semantic JSX and native controls. Do not add keyboard handlers merely because an element has `onClick`; choose the correct element first.
- Keep state minimal and colocated. Avoid effects for values that can be derived during render, and clean up external subscriptions.
- Preserve the project's server/client boundary, export convention, styling approach, and React version.
- Default to `component-name/index.tsx`; add style/test files only when the project or request requires them.
- Detect the actual React framework and build tool from the repository. Use its declared scripts; React alone does not imply Vite, Next.js, Create React App, or a particular runtime command.

### ASP.NET Core MVC and Razor Pages

- Read [`aspnet-core.md`](aspnet-core.md) completely for `.cshtml`, MVC views/controllers, Razor Pages/PageModels, partials, view components, Tag Helpers, or `Microsoft.NET.Sdk.Web` projects.
- Preserve whether the project uses MVC, Razor Pages, or both. Keep semantic HTML and the general guideline as the rendered-output standard.
- Treat Razor encoding, antiforgery, model binding, authorization, validation, routing, layouts, and server-to-client data transfer as review-critical boundaries.
- Validate the selected SDK-style web project with the repository's .NET workflow. Use `dotnet run --project <web.csproj>` only when a runtime check is needed and startup side effects, environment, dependencies, and process cleanup are controlled.

## Output Contract

### Audit

Lead with findings, grouped by file and ordered by severity. Use clickable `file:line` locations when possible.

```text
## Findings

### src/button/index.html
- [High][Accessibility] src/button/index.html:18 — Icon-only button has no accessible name. Add an aria-label that states the action.
- [Medium][Performance] src/button/index.html:31 — Image has no dimensions, so it can cause layout shift. Set width/height or aspect-ratio.

### src/modal/style.css
✓ No findings.

## Lighthouse
| Category | Score |
| --- | ---: |
| Performance | 94 |
| Accessibility | 100 |
| Best Practices | 96 |
| SEO | 92 |

## Verification gaps
- Keyboard dialog flow not manually tested.
```

Include the Lighthouse table only when scores were measured or explicitly requested; otherwise say `Lighthouse not run` when that limitation matters. Avoid a pass claim when relevant behavior could not be exercised.

### Fix or Create

Create files in the requested framework shape. Then report:

1. What was implemented or corrected.
2. The framework and output paths.
3. Validation actually performed and any remaining gaps.

Do not paste every file into the response when the files were written to the workspace. Do not claim a Lighthouse, accessibility, or responsive pass unless it was verified.

## Reference Hierarchy

Use authoritative sources for requirements and current tool behavior:

- [Chrome Lighthouse documentation](https://developer.chrome.com/docs/lighthouse/)
- [Lighthouse performance scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/)
- [Web Vitals](https://web.dev/articles/vitals)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [How to Meet WCAG 2](https://www.w3.org/WAI/WCAG22/quickref/)
- [Angular CLI](https://angular.dev/tools/cli), [Angular build](https://angular.dev/tools/cli/build), and [React project/tooling guidance](https://react.dev/learn/creating-a-react-app)
- [ASP.NET Core Razor syntax](https://learn.microsoft.com/aspnet/core/mvc/views/razor), [Razor Pages](https://learn.microsoft.com/aspnet/core/razor-pages/), and [`dotnet run`](https://learn.microsoft.com/dotnet/core/tools/dotnet-run)
- [Vercel Labs agent skill](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) and its [current Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) as advisory sources for concise UI review rules; the versioned local skill remains normative.
- [W3Schools Accessibility](https://www.w3schools.com/accessibility/) and [Responsive Web Design](https://www.w3schools.com/html/html_responsive.asp) for approachable examples, not as the normative source.

When sources conflict, follow the relevant standard, browser/framework documentation, and the target project's requirements over tutorial examples.
