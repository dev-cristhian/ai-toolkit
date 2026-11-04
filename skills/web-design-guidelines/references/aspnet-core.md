# ASP.NET Core MVC and Razor Pages

Read this reference when the target contains `.cshtml` files, an SDK-style web project, MVC controllers/views, Razor Pages, partial views, view components, or Tag Helpers. Apply it together with `guidelines.md`.

## Detect the Application Model

- Inspect the `.csproj`, target frameworks, `Program.cs`, service registration, endpoint mapping, `_ViewImports.cshtml`, `_ViewStart.cshtml`, and `launchSettings.json` before choosing APIs or commands.
- Treat `<Project Sdk="Microsoft.NET.Sdk.Web">`, `AddControllersWithViews`, `AddRazorPages`, `MapControllerRoute`, and `MapRazorPages` as strong ASP.NET Core signals.
- Distinguish MVC views (`Views/<Controller>/<Action>.cshtml`) from Razor Pages (`Pages/<Route>.cshtml` plus an optional `.cshtml.cs` PageModel).
- A file with `@page` is an endpoint, not a partial. Partial views normally begin with `_` and do not execute `_ViewStart.cshtml`.
- Do not assume legacy ASP.NET MVC 5 projects using `System.Web.Mvc`, `packages.config`, or non-SDK .NET Framework projects can run with `dotnet run`. Follow their existing MSBuild, Visual Studio, IIS Express, and test workflow.
- Preserve the installed ASP.NET Core and C# versions. Do not introduce APIs or Razor syntax unsupported by the target framework.

## Razor Markup and Composition

- Keep semantic, accessible HTML as the rendered result. Razor and Tag Helpers do not replace the general accessibility, responsive, performance, or SEO rules.
- Prefer URL-generation Tag Helpers (`asp-controller`, `asp-action`, `asp-page`, `asp-route-*`) over fragile hard-coded application URLs.
- Use layouts for shared page structure, partials for reusable markup, and view components when rendering requires server-side behavior or data access. Do not place business logic in `.cshtml`.
- Keep `_ViewImports.cshtml`, `_ViewStart.cshtml`, layout sections, partial locations, and naming consistent with the project.
- Pass a deliberate view model to views and partials. Avoid broad service access, dynamic bags, or oversized domain entities when a focused model improves safety and clarity.
- Use `asp-append-version` for project-owned static assets when the existing pipeline relies on ASP.NET Core cache busting.
- Put page-specific scripts and styles in the project's established sections or asset pipeline. Avoid duplicate library loads and blocking scripts in the page body.
- Keep element IDs unique after partials, editor templates, collections, and validation markup render multiple times.

## Security, Binding, and Forms

- Razor encodes normal string expressions by default. Treat `Html.Raw`, `HtmlString`, `IHtmlContent`, inline JavaScript interpolation, and manually constructed markup as security-sensitive. Never render untrusted content without a proven sanitizer and context-appropriate encoding.
- Trace untrusted values through `@Html.Raw`, custom `IHtmlContent`/Tag Helpers, `HtmlString`, unsafe JSON serialization, inline event handlers/scripts, `data-*` handoff, URL generation, and client-side DOM sinks. Razor's HTML encoding does not provide the correct encoding for JavaScript, CSS, URL, or raw-HTML contexts.
- Prefer Tag Helpers and encoded `data-*` attributes for passing server values to JavaScript. Do not concatenate untrusted values into script, style, URL, or HTML contexts.
- Protect unsafe requests against cross-site request forgery. Preserve the framework's antiforgery behavior for Razor Pages and use the project's established antiforgery validation for MVC actions and AJAX requests.
- Authorization must be enforced on the page, handler, controller, or service boundary. Hiding a link or button is not authorization.
- Use focused input/view models and explicit binding boundaries to reduce overposting. Treat route, query, header, form, and database values as untrusted.
- Check `ModelState` before acting on submitted values. Render validation summaries and field messages accessibly, retain entered data, and use the Post/Redirect/Get pattern when it fits the workflow.
- Use the form, input, label, select, textarea, and validation Tag Helpers consistently. Ensure generated names, IDs, labels, validation messages, and autocomplete tokens remain correct.
- Preserve cookie security, HTTPS redirection, authentication, authorization, CSP, and other middleware ordering when `Program.cs` changes.
- Do not expose secrets from configuration, user-secrets, environment variables, logs, or rendered markup. Never commit production credentials to `appsettings*.json`.

## Handlers, Controllers, and Runtime Behavior

- Review Razor Page handlers (`OnGet*`, `OnPost*`) and MVC actions together with their markup, binding model, authorization, validation, redirects, and returned status codes.
- Make state-changing operations explicit and idempotent where required. Prevent accidental duplicate submissions and do not perform state changes from GET requests.
- Use asynchronous I/O end to end when the underlying operation is asynchronous; propagate cancellation when the project convention supports it.
- Keep errors user-safe and actionable while preserving diagnostic detail in server logs. Do not render exception details or sensitive data to clients.
- Confirm routes, areas, conventional/attribute routing, page handlers, and generated links remain consistent after moves or renames.
- When localization is enabled, use the project's localizers, resource files, request-culture setup, and localized validation messages rather than hard-coded user-facing strings.

## Testing and Validation

Identify the web `.csproj` rather than assuming the solution's first project is runnable.

Recommended sequence, adapted to repository conventions:

```text
dotnet --info
dotnet build <solution-or-relevant-projects> --no-restore
dotnet test <solution-or-test-project> --no-build --no-restore
dotnet run --project <web-project.csproj> --no-build --no-restore [--launch-profile <profile>]
```

- `dotnet build`, `test`, and `run` can restore implicitly. Prefer `--no-restore` after dependencies are available so an audit does not silently change dependency state or require the network.
- Use `dotnet test --no-build` only after the selected test projects have been built, normally by building the solution or those projects explicitly.
- If restore is genuinely required, use the repository's documented process. When a lock file is enforced, use locked mode. Record restore failures as a validation gap; do not update packages or lock files during review.
- A build or run writes generated output under `bin` and `obj`. Never treat that output as authored source. Recheck version-control status and report unexpected tracked modifications.
- For a multi-targeted runnable project, select the intended framework explicitly when `dotnet run` requires it.
- Inspect the selected launch profile, environment, URLs, secrets, database, queues, email, migrations, and seed behavior before starting the app. Do not run against production services or start an app that performs unsafe automatic side effects.
- Prefer existing integration tests using `WebApplicationFactory`/`TestServer` for repeatable endpoint checks. Run targeted tests for changed controllers, pages, handlers, and authorization paths when available.
- For browser, responsive, accessibility, or Lighthouse validation, start the correct web project on localhost, wait until it is ready, exercise representative changed routes, capture the actual URL/profile/framework, and always stop the process afterward.
- A successful build is not proof that Razor output, routing, model binding, authorization, client behavior, or accessibility works. Report all unexecuted runtime/manual checks.

## Typical Deliverable Locations

Follow the target project rather than forcing a new convention. Common shapes include:

```text
# MVC view
Views/<Controller>/<Action>.cshtml

# Razor Page
Pages/<Feature>/Index.cshtml
Pages/<Feature>/Index.cshtml.cs

# Shared partial
Views/Shared/_Button.cshtml
# or Pages/Shared/_Button.cshtml

# View component
ViewComponents/ButtonViewComponent.cs
Views/Shared/Components/Button/Default.cshtml
```

Use a partial for markup reuse and a view component when the reusable unit needs server-side execution. Do not create a PageModel, controller, or view component for a static fragment without a concrete need.

## Primary References

- [Razor syntax](https://learn.microsoft.com/aspnet/core/mvc/views/razor)
- [Razor Pages](https://learn.microsoft.com/aspnet/core/razor-pages/)
- [Partial views](https://learn.microsoft.com/aspnet/core/mvc/views/partial)
- [View components](https://learn.microsoft.com/aspnet/core/mvc/views/view-components)
- [Prevent XSS in ASP.NET Core](https://learn.microsoft.com/aspnet/core/security/cross-site-scripting)
- [ASP.NET Core integration tests](https://learn.microsoft.com/aspnet/core/test/integration-tests)
- [`dotnet run`](https://learn.microsoft.com/dotnet/core/tools/dotnet-run)
