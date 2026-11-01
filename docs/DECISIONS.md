# Archer Architecture & Product Decisions

## ADR-001 — Laravel is business-rule authority
**Decision:** Laravel owns authoritative business logic and authorization.

**Reason:** Prevent duplicated business policy across multiple Next.js applications.

## ADR-002 — Next.js for all user-facing experiences
**Decision:** Use Next.js for public website, Admin, Client PWA, and Driver PWA.

**Reason:** Consistent modern frontend stack while keeping backend authority centralized.

## ADR-003 — MySQL
**Status:** Supersedes the prior PostgreSQL decision on 2026-10-28.

**Decision:** MySQL is the production system of record.

**Reason:** The project owner confirmed MySQL for the initial Hostinger Business Web Hosting deployment.

**Consequences:** Laravel migrations must target the approved MySQL version and use transactional, indexed, foreign-key-backed schema design. Money is stored as exact decimal/minor-unit values, never floats. Before production deployment, confirm the actual Hostinger MySQL version, `sql_mode`, character set/collation, connection/storage limits, backup/restore capability, and compatibility through a staging migration rehearsal.

## ADR-004 — Current WordPress remains live during rebuild
**Decision:** Keep the existing Archer WordPress website live while the new Next.js site is developed and tested.

**Reason:** Avoid disrupting the current public site before UAT/cutover.

## ADR-005 — Mobile apps use hybrid/WebView packaging
**Decision:** Build mobile-first PWAs and package them for iOS/Android rather than building separate Swift/Kotlin applications.

**Reason:** Meet store-distribution requirements without maintaining separate native codebases.

## ADR-006 — Square
**Decision:** Square is the current required payment direction.

**Open confirmation:** Production credentials/provider configuration must be confirmed before live payment processing.

## ADR-007 — AI engineering workflow
**Decision:** Codex is primary implementation agent; Claude Code is second-engineer reviewer.

**Rule:** Do not have both agents independently implement the same feature.

## ADR-008 — Brand tokens are engineering constraints
**Decision:** Archer brand colors, typography, logo rules, and visual direction are part of the implementation baseline, not optional marketing guidance.

## ADR-009 — Exact financial formulas require approved rules package
**Decision:** No agent may invent pricing, payment, tax, payroll, or compensation formulas.

## ADR-010 — Third-party credentials
**Decision:** Use secure invitations, delegated access, API keys, and secret management. Do not request or transmit passwords through chat.

## ADR-011 — Dynamic Service Types & Right Sidebar Panel Management
**Decision:**
1. Service types (e.g., Airport Transfer, Hourly, Client Car, Intercity, Security Convoy, etc.) are fully manageable dynamically by admin users.
2. In the Admin Panel, adding a new service or editing an existing service must open as a **Right Slide-over Sidebar Drawer**, keeping the active list/table in view behind the drawer.
3. Service mutations are authoritative in Laravel with audit safety (soft deletes). Frontend views pull active services via public API.
