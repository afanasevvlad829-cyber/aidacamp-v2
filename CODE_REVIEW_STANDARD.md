# Code review standard

## Purpose

Every change must preserve behavior while making the codebase easier to understand, test, and maintain. Reducing code is preferred when it removes duplication, dead paths, or unnecessary abstraction; line count must never be reduced at the expense of correctness or clarity.

## Required review sequence

1. Run the repository's stack, type, test, and production-build checks.
2. Review only the proposed diff and trace every changed execution path.
3. Confirm that business logic, analytics, SEO, forms, payments, and public URLs keep their intended behavior.
4. Look for duplicated logic, hard-coded business values, dead code, unsafe DOM access, hidden coupling, and unnecessary dependencies.
5. Prefer existing utilities and components over new parallel implementations.
6. Verify that the change does not make another repository build or deploy.
7. Record unresolved risks in the PR; do not hide failures by weakening checks.

## Approval criteria

A PR may leave draft status only when:

- all required automated checks pass;
- every changed line has a clear purpose;
- no confirmed dead or duplicate code is introduced;
- configuration and business constants have one authoritative source;
- error and empty states remain safe;
- the reviewer has compared behavior before and after;
- merge and deployment permissions have been granted separately.

## Reviewer report

Keep the report concise:

- blocking findings;
- non-blocking improvements;
- checks performed;
- behavior or metrics before and after;
- explicit approval or request for changes.

