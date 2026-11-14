---
version: alpha
name: FixFlow
description: A clear property management desk for repair decisions.
colors:
  landlord-accent: "#0c4a6e"
  landlord-soft: "#e0f2fe"
  landlord-dark-surface: "#020617"
typography:
  sans:
    fontFamily: "Geist, sans-serif"
  mono:
    fontFamily: "Geist Mono, monospace"
rounded:
  button: "0.75rem"
  card: "1rem"
spacing:
  page-max: "64rem"
  section-gap: "1.75rem"
components:
  button: {}
  card: {}
  input: {}
---

# FixFlow design system

## Overview

### Creative North Star

FixFlow should feel like a clear property management desk: a landlord can understand a repair, decide, and move on without learning technical terms. The primary audience includes landlords aged 40–60 who may be new to AI. Plain words, large text, and one obvious next action matter more than decoration.

### Product context and register

The team plan in `docs/TEAM_PLAN.md` is the product brief. This is a task-focused web app in English. A repair can be urgent, so the screen should remain readable on a phone and at a desk. Its signature is a large, readable decision card with the contractor, price, and time together. The interface avoids dashboard decoration that competes with that decision.

## Colors

The team plan assigns forest green to tenant surfaces, baby blue to landlord surfaces, and navy red to contractor information. Teammate A owns the shared theme, light/dark switching, and final palette. Teammate B's landlord screens currently use Tailwind sky and slate shades as a provisional reading of the baby-blue direction. Do not treat these utility shades as final shared tokens.

## Typography

The existing app uses Geist and Geist Mono. Body copy is at least 16px on the landlord screens, with larger headings and plain sentence case labels. Price and time are prominent but do not replace descriptive labels.

## Layout

The existing app uses a centered `max-w-5xl` page shell in `frontend/src/app/layout.tsx`. Landlord pages retain that shell and use a large page title, rounded cards, and generous tap targets. Navigation uses short, literal labels and wraps on narrow screens.

## Components

Buttons use a 0.75rem radius and clear solid or outline emphasis. Cards use a 1rem radius. Native text fields, selects, and the file picker keep their built-in keyboard behavior. The landlord shell in `frontend/src/components/landlord/LandlordShell.tsx` owns local navigation.

## Motion and iconography

No decorative motion is required for a repair decision. Status and urgency use words, not icons alone. Focus and hover changes are restrained and immediate.

## Accessibility

Status and urgency always have text labels. Approval is a prominent action; decline is visible but secondary. Empty, loading, and failure states explain the next step. Keyboard focus remains visible. Light and dark variants are supplied on landlord surfaces while teammate A implements the shared theme.

## Token ownership and mapping

`frontend/src/app/globals.css` and teammate A's shared theme are the canonical runtime token owners. `frontend/src/components/landlord/LandlordShell.tsx` supplies landlord-only navigation and the sky accent. This document records current intent; teammate A should reconcile exact tokens and cross-route theme behavior before release.
