# Subscription Mark as Paid — Design Spec

**Date:** 2026-06-09

## Overview

Add a "Paid" button to each subscription card that advances the renewal date by one billing period. This lets the user record an early payment (e.g. paying the ISP before the due date) so the subscription's next renewal date reflects the actual billing cycle going forward.

## Feature Behaviour

- A **"Paid" button** appears on every subscription card that has a `renewalDate` set.
- Subscriptions with no `renewalDate` do **not** show the button (nothing to advance).
- Clicking "Paid" computes the next renewal date from the current `renewalDate` (not from today), preserving the original billing anchor:
  - `monthly` → +1 month
  - `quarterly` → +3 months
  - `yearly` → +12 months
- The updated date is saved immediately via the existing `PUT /api/subscriptions/:id` endpoint, sending the full subscription payload with the new `renewalDate`.
- The list re-fetches using the existing `mutate()` SWR pattern.
- No confirmation dialog — the action is reversible via the Edit modal.

## UI

- The button sits in the existing action row alongside **Edit** and **Del**.
- Styled as a small green button (matching the app's button convention) — label: `Paid`.

## Data Flow

```
User clicks "Paid"
  → advanceRenewalDate(renewalDate, period)   // pure function, client-side
  → PUT /api/subscriptions/:id  { ...subscription, renewalDate: newDate }
  → mutate()  // re-fetches list
```

## Scope

- **In scope:** `SubscriptionsPage.tsx` only. One helper function, one button per card.
- **Out of scope:** No backend changes, no schema changes, no payment history tracking.
