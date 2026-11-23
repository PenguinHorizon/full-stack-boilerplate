# Tourism Platform — Project Documentation

A multi-tenant platform: every **organization** (tour operator, agency, …)
gets its own branded public website, and they all share one admin portal and
one API. This repository is the cleaned-up foundation; the tourism features
are added on top of it, phase by phase.

## Documents

- [Local setup guide](setup.md): run the API and web app, demo URLs and
  accounts, troubleshooting.
- [Adding a feature](adding-a-feature.md): the checklist for a new domain
  module (backend, contracts, permissions, admin screens, public pages, tests).
- [Architecture decision log](architecture-decisions.md): the platform-level
  decisions, with context and consequences.
- [Testing guide](testing.md): unit, e2e, QA suite, consistency checks, browser
  sweep.
- [Deployment guide](deployment.md): production on one server with Docker —
  DNS, configuration, first deploy, certificates, upgrades, monitoring.
- [Operations runbook](operations.md): backups, restores, incidents.

## What the foundation provides

| Area | What is there |
| ---- | ------------- |
| Tenancy | Organizations with settings, custom domains / subdomains, status (draft → active → suspended → archived) |
| Identity | Staff accounts (JWT + rotating refresh cookies, password reset), platform super admins, per-organization memberships |
| Roles | Owner, Admin, Manager, Member — permission matrix in code (`roles.config.ts`), mirrored in the UI |
| Admin portal | Shell with organization switcher, notification bell, dashboard + setup checklist, team, audit log, media library, settings (profile, branding, website & SEO) |
| Public website | Per-organization branded site: home sections, banners, gallery, testimonials, FAQs, About/Privacy/Terms, contact form, customer accounts, SEO (sitemap, robots), draft preview |
| CRM | Customers list/detail (block, notes), contact-form inbox |
| Platform console | Organizations (onboarding), staff accounts, platform audit log |
| Operations | Migrations with drift checks, consistency checks, encrypted backups, Docker + Caddy deploy, CI |
