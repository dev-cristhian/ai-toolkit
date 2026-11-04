# JavaScript Web Stacks

Read this reference when the target contains `package.json`, JavaScript/TypeScript, Vanilla tooling, Angular, React, or a Node-based web framework. Apply it together with `guidelines.md`.

## Detect Project Boundaries and Tooling

- Map each changed file to the nearest owning project or workspace before selecting commands. A repository can contain several independent frontends or a frontend nested inside an ASP.NET solution.
- Inspect `package.json`, its `scripts` and `packageManager` fields, lock files, workspace configuration, Node version files, TypeScript configuration, framework configuration, and CI workflow.
- Select the package manager from the repository evidence. Typical signals are `package-lock.json` for npm, `pnpm-lock.yaml` for pnpm, `yarn.lock` for Yarn, and `bun.lock`/`bun.lockb` for Bun. Do not mix package managers or generate a second lock file.
- Respect `engines`, `.nvmrc`, `.node-version`, Volta/Corepack settings, and the package manager version pinned by the project.
- Use project-local tools through declared scripts or the selected package manager. Do not prefer a globally installed Angular CLI, TypeScript, test runner, or bundler over the repository version.
- Do not infer the framework from file extensions alone. Confirm Angular with `angular.json` and Angular packages; confirm React and its runtime/build framework from dependencies and configuration.

## Validation Contract

Prefer scripts already declared by the owning project. Inspect what a script does before running it; names such as `test`, `check`, or `build` are conventions, not guarantees.

Common validation dimensions are:

```text
<package-manager> run format:check   # only when declared; never write mode during an audit
<package-manager> run lint
<package-manager> run typecheck
<package-manager> test
<package-manager> run build
<package-manager> run e2e            # when proportionate and configured
```

- Run only scripts that exist, using their actual names and required non-watch/CI options. Do not copy flags from another test runner.
- In monorepos, target the affected workspace/project first, then use the repository's affected or aggregate command when broader validation is warranted.
- During an audit, do not install, update, deduplicate, audit-fix, or regenerate dependencies. If dependencies are missing, report the blocked validation rather than running `npm install`, `npm audit fix`, framework updates, or equivalents.
- If the task explicitly authorizes dependency installation, use the selected manager's lock-preserving workflow. For npm CI environments, `npm ci` requires a compatible lock and does not update `package.json` or `package-lock.json`, but it replaces `node_modules`; do not run it casually in a user's working tree.
- Treat `dist`, `build`, `.next`, coverage, caches, generated routes/types, and test artifacts as validation output. Recheck pending changes and report unexpected tracked modifications.
- A successful build does not prove runtime behavior, accessibility, responsive layout, hydration, routing, or server/client integration.

## Vanilla HTML, CSS, and JavaScript

- A static Vanilla component may need no Node command. Validate the actual HTML, CSS, JavaScript, links, assets, and browser behavior instead of introducing a build tool.
- When a Vanilla project has `package.json`, use only its existing formatter, linter, test, bundler, or local-server scripts.
- Preserve progressive enhancement and verify that essential content/functionality does not disappear when optional JavaScript fails.
- Trace untrusted values into DOM execution/injection sinks including `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, string-based `eval`/`Function`/timers, script or event-handler attributes, and `javascript:` URLs. Prefer `textContent`, DOM construction, safe URL handling, and a proven sanitizer when HTML is genuinely required.

## Angular

- Inspect `angular.json` to identify affected applications/libraries, builders, configurations, assets, styles, budgets, test targets, and serve targets.
- Prefer declared package scripts. Otherwise invoke the project-local Angular CLI through the selected package manager and target the affected project explicitly when the workspace contains more than one.
- Run configured lint, unit-test, production-build, and e2e targets as proportionate to the change. Use a non-watch mode appropriate to the installed Angular/test-runner version.
- Treat Angular build budget warnings/errors, CommonJS optimization warnings, template compiler errors, strict-template errors, and browser compatibility settings as review evidence.
- Review templates and components together: bindings, signals/observables, change detection, subscriptions/cleanup, routing, guards, forms, sanitization, SSR/hydration, and lazy loading where applicable.
- Do not assume every Angular application is client-only. Inspect whether the configured builder produces browser, server, prerendered, or hybrid output.
- Audit `DomSanitizer.bypassSecurityTrust*`, `SafeValue` provenance, `[innerHTML]`, resource URLs, dynamically constructed templates, `ElementRef.nativeElement`, direct DOM/third-party DOM manipulation, and disabled Trusted Types/CSP protections. Angular's normal template binding sanitization does not make bypass APIs or direct DOM sinks safe.

## React

- React does not determine the build or runtime command. Identify whether the project uses Next.js, React Router framework mode, Vite, Parcel, Rsbuild, a custom bundler, SSR, SSG, or a client-only application.
- Use the framework's existing scripts and configuration; do not assume Create React App or Vite. Create React App is deprecated, but an existing project still must be reviewed according to its actual toolchain.
- Review component semantics, hook dependencies and cleanup, state ownership, rendering stability, keys, error/loading boundaries, routing, forms, data fetching, code splitting, and server/client boundaries when relevant.
- For SSR or hydration, verify deterministic server/client output and keep browser-only APIs out of server execution paths.
- Production builds, framework lint/type checks, unit/component tests, and configured e2e tests are stronger evidence than starting a development server alone.
- Audit `dangerouslySetInnerHTML`, direct DOM writes through refs or third-party libraries, untrusted `href`/`src` values, raw HTML from Markdown/CMS content, server-to-client serialization into scripts, and misuse of `suppressHydrationWarning`. JSX escapes text by default, but raw HTML and imperative DOM escape that protection.

## Node and Server Rendering Security

- Verify the escaping behavior and context of the actual template engine; HTML escaping is not sufficient for JavaScript, CSS, URL, or JSON-in-script contexts.
- Serialize server data into the client with a framework-supported mechanism or safe serializer. Prevent `</script>` breakouts, prototype pollution, open redirects, header injection, and unsafe proxying of attacker-controlled URLs.
- Keep secrets and server-only modules out of client bundles. Review SSR/server actions, loaders, middleware, and BFF endpoints as trust boundaries with authentication, authorization, CSRF, validation, and output encoding appropriate to their behavior.

## Node-Based Runtime and Browser Checks

- Start a server only when runtime, browser, accessibility, responsive, integration, or Lighthouse checks require it.
- Choose the declared `dev`, `start`, `serve`, or `preview` script that matches the validation goal. Prefer a production build plus its documented preview/start mode for Lighthouse when practical; development servers distort performance results.
- Inspect environment files, proxies, API endpoints, databases, queues, email, authentication, seed behavior, and background jobs before startup. Never use production credentials or resources for an audit.
- Bind to localhost on an available port, wait for readiness, test the changed routes, record the command and URL, and always terminate the server—even after a failed check.
- For a frontend that depends on a separate API or ASP.NET host, validate the integration contract and start each required process only when its side effects and shutdown are controlled.

## Mixed and Monorepo Solutions

- Build a validation matrix of affected project → stack → command → result. Do not run only the root command unless it actually covers every affected project.
- A solution containing ASP.NET plus Angular/React may require both the .NET flow and the selected JavaScript package-manager flow. Neither replaces the other.
- Shared packages, design systems, generated clients, API contracts, and workspace configuration can affect multiple applications; expand validation only to the impacted dependents.
- Report each unvalidated affected project as a coverage gap. Never present one successful project build as approval for the whole pending change set.

## Primary References

- [npm scripts](https://docs.npmjs.com/cli/using-npm/scripts)
- [`npm ci`](https://docs.npmjs.com/cli/commands/npm-ci/)
- [Angular CLI](https://angular.dev/tools/cli)
- [Angular build](https://angular.dev/tools/cli/build)
- [Angular testing](https://angular.dev/guide/testing)
- [Angular security](https://angular.dev/best-practices/security)
- [Creating a React app](https://react.dev/learn/creating-a-react-app)
- [React `dangerouslySetInnerHTML`](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html)
- [Vite CLI](https://vite.dev/guide/cli)
