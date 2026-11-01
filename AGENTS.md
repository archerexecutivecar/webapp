# Archer Engineering Agent Contract

## Purpose
This repository contains the production Archer Executive Services platform. Treat these instructions as mandatory engineering policy for Codex, Claude Code, human developers, and QA.

## Non-negotiable rules
1. Build a production system, not a prototype demo.
2. Laravel is the authoritative business-rule, authorization, financial, dispatch, payroll, and operational layer.
3. Next.js applications are presentation/client workflow layers. Do not duplicate business rules in frontend code.
4. Never invent pricing, fees, taxes, payroll formulas, eligibility rules, status transitions, permissions, or operational exceptions.
5. Exact financial/business formulas must come from the approved Archer rules/test package.
6. If source documents conflict or a required rule is missing, STOP and escalate. Do not guess.
7. Validate every privileged, financial, and operational mutation on the server.
8. Every new business rule requires automated tests.
9. Every database schema change requires a migration.
10. Every external webhook must be authenticated/verified and idempotent.
11. Never trust frontend totals, role claims, driver eligibility, vehicle availability, or payment state.
12. Never commit passwords, API secrets, production credentials, private keys, or credential screenshots.
13. Do not silently expand scope. Record a clarification/change item.
14. Preserve audit history for operational and financial changes.
15. Use the prototype for UX intent; use the approved handoff/rules package for functional truth.
16. Claude Code reviews the actual diff/code after Codex implementation. Do not have both agents independently implement the same feature.

## Architecture
- Public Website: Next.js
- Admin/Operations: Next.js
- Client PWA: Next.js
- Driver PWA: Next.js
- Backend/API/domain core: Laravel
- Database: PostgreSQL
- Private documents: S3-compatible object storage
- Payments: Square, subject to final production credential/provider confirmation
- Mobile distribution: WebView/hybrid iOS + Android packaging
- Testing: Playwright + Laravel/PHP automated tests
- CI/CD: GitHub Actions

## Repository layout
apps/
  web/
  admin/
  client/
  driver/
backend/
  laravel/
packages/
  ui/
  types/
  config/
docs/
  architecture/
  api/
  business-rules/
  database/
  qa/
  decisions/

## Required implementation workflow
Requirement → acceptance criteria → source/rule identification → architecture check → Codex implementation → automated tests → Claude review → fixes → QA → demo → acceptance → merge/release.

## Definition of Ready
- Requirement linked to a source.
- Acceptance criteria written.
- Business rule identified.
- UI and error states identified.
- Roles/permissions identified.
- API/database impact identified.
- External dependencies identified.
- Tests identified.
- Open decisions listed.

## Definition of Done
- Code complete and reviewed.
- Tests pass.
- Authorization verified.
- Migration reviewed.
- Audit behavior verified.
- Critical errors handled.
- Responsive/mobile behavior verified.
- QA passed.
- Acceptance criteria met.
- Demo completed.
- No secrets/debug artifacts.
- Documentation updated when behavior changes.

## Before every commit
- Check source-of-truth hierarchy.
- Check authorization.
- Check server-side validation.
- Check financial/concurrency impact.
- Add/update tests.
- Run relevant tests.
- Review diff.
- Confirm no secrets.
- Confirm no silent scope expansion.
