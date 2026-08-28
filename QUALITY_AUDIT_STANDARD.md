# Quality audit standard

This standard defines a risk-based audit. No single tool or review can prove that a project has no defects.

## Layers

1. **Static correctness** — build, strict types, lint, formatting, dead imports, unreachable code.
2. **Maintainability** — duplication, hard-coded business values, module boundaries, cyclic dependencies, unnecessary abstractions and dependencies.
3. **Automated behavior** — unit, integration and end-to-end tests; coverage identifies untested paths; mutation testing measures whether tests detect defects.
4. **Runtime behavior** — browser console, forms, APIs, redirects, 404s, empty/error states and real-data validation.
5. **Security and supply chain** — secrets, SAST, dependency vulnerabilities, input handling, headers, CSP and license risk.
6. **User-facing quality** — accessibility, SEO, Core Web Vitals, bundle size and visual regression.
7. **Production evidence** — logs, monitoring, analytics anomalies and incident history.
8. **Independent review** — a reviewer validates the diff, behavior, architecture and evidence before approval.

## Completion evidence

An audit report must state for every layer:

- tool or method used;
- scope and exclusions;
- findings confirmed or rejected;
- before/after metric;
- unresolved risk and owner.

A layer is not complete when its tool could not run, required secrets or data were unavailable, or only the author's self-review was performed.

## Optimization KPI

Prefer fewer executable paths, less duplication and fewer authoritative sources. Raw line count is a supporting metric, not a target: generated files, tests, safety guards and clear types may legitimately add lines. Any claimed reduction must preserve behavior and pass the same or stronger checks.

