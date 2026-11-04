---
name: web-design-guidelines
description: Create, improve, or audit web interfaces and reusable UI components for accessibility, responsive design, UX, Lighthouse quality, and SEO. Use for Vanilla HTML/CSS/JavaScript, Node-based web tooling, Angular, React, or ASP.NET Core MVC/Razor Pages; do not use for backend-only tasks.
metadata:
  author: ai-toolkit
  version: "2.3.0"
  argument-hint: <file-or-pattern-or-component-request>
  hub-level: "2"
  hub-description-pt: "Cria, melhora ou audita interfaces web com foco em acessibilidade (WCAG), responsividade, UX, Lighthouse e SEO. Funciona com HTML/CSS/JS puro, Angular, React e ASP.NET Core MVC/Razor."
  hub-tags: "frontend, accessibility, ux, seo, lighthouse"
---

# Web Design Guidelines

Build, improve, or review web UI while preserving the project's existing design system and conventions.

## Start Here

1. Read [`references/guidelines.md`](references/guidelines.md) completely.
   - For `package.json`, Vanilla projects with Node tooling, Angular, React, or another Node-based web framework, also read [`references/javascript-stacks.md`](references/javascript-stacks.md) completely.
   - For ASP.NET Core MVC, Razor Pages, `.cshtml`, or `Microsoft.NET.Sdk.Web`, also read [`references/aspnet-core.md`](references/aspnet-core.md) completely.
2. Determine the requested mode:
   - **Audit**: report issues without changing files.
   - **Fix**: edit the supplied interface and verify the result.
   - **Create**: implement the requested page or component.
3. Inspect the relevant files and project configuration before choosing syntax, framework APIs, or dependencies.
4. Apply the guidelines proportionally to the artifact. Page-level SEO checks, for example, do not belong to an isolated button unless the surrounding page is also in scope.

For audit work, the files shipped in this skill are the mandatory, versioned, normative baseline. Do not replace or silently override them with remote content. If web access is available, the current [Vercel Labs Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) may be consulted only as advisory input. Record the upstream URL and revision/date when it materially influences a finding; a remote-only rule cannot change the verdict until it is adopted into the local skill.

If the request is ambiguous between audit and modification, prefer audit. If no target was supplied and the repository does not make it evident, ask for the file, pattern, URL, or component.

## Implementation Defaults

- Use the framework already present in the target project.
- For a standalone new component with no framework specified, use Vanilla HTML, CSS, and JavaScript.
- Support Node-based Vanilla tooling, Angular, React, or ASP.NET Core MVC/Razor Pages when the user requests one of them or the existing project clearly uses it.
- Preserve established naming, styling, test, lint, localization, and accessibility conventions.
- Do not add a UI library, CSS framework, icon package, or runtime dependency unless the request or project already calls for it.

Use a kebab-case component folder. The default deliverable shapes are:

```text
# Vanilla (default)
button/
|-- index.html
|-- style.css
`-- script.js

# Angular
button/
|-- button.component.ts
|-- button.component.html
`-- button.component.css

# React
button/
`-- index.tsx

# ASP.NET Core Razor Page
Pages/Button/
|-- Index.cshtml
`-- Index.cshtml.cs

# ASP.NET Core view component
ViewComponents/
`-- ButtonViewComponent.cs
Views/Shared/Components/Button/
`-- Default.cshtml
```

Add adjacent style, test, story, code-behind, or module files only when requested or consistent with the repository. For Angular, follow the project's standalone/module convention and stylesheet extension. For React, follow its existing export and styling convention. For ASP.NET Core, preserve the project's MVC/Razor Pages model and use partials or view components according to the server-side behavior required; do not force a JavaScript component folder convention onto Razor.

## Evidence and Verification

- Separate findings proven by source inspection from results measured by a tool.
- Never invent Lighthouse scores. Report category scores and performance metrics only from an actual run or a supplied report.
- When a runnable page is available, use the project's existing validation commands and, when practical, run Lighthouse for Performance, Accessibility, Best Practices, and SEO.
- For Node-based Vanilla, Angular, and React projects, detect the owning workspace, package manager, framework, and declared scripts before validating. Follow `references/javascript-stacks.md`; do not assume npm, Vite, Create React App, or a single root project.
- For SDK-style ASP.NET Core web projects, validate with the appropriate `dotnet build`/`dotnet test` flow and, when runtime or browser checks are needed and startup is safe, run the selected web project with `dotnet run --project <web.csproj>`. Follow `references/aspnet-core.md` for restore, launch profile, side-effect, and process-cleanup rules.
- In hybrid or monorepo solutions, validate every affected project with its own toolchain. A successful Node build does not cover ASP.NET, and a successful .NET build does not cover Angular or React.
- Treat automated accessibility checks as partial coverage; include keyboard and manual checks where the scope warrants them.
- If execution is unavailable, provide a static review and state what remains unmeasured.

## Response Shape

Follow the mode-specific output contract in `references/guidelines.md`:

- Audit: concise findings grouped by file, followed by measured results and verification gaps when applicable.
- Fix or create: implement the files, then summarize the deliverable and validation performed.
- Do not emit React boilerplate for a Vanilla, Angular, or Razor request.
