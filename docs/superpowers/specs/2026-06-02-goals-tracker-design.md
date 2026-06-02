# Goals Tracker — Design Spec

## Overview

A goals tracker organized by customizable life areas. Goals live inside areas, have milestones and optional linked habits, and track blended progress across both.

## Data Model

```
LifeArea
  id          Int      @id @default(autoincrement())
  name        String
  color       String   -- hex color for the card accent
  goals       Goal[]

Goal
  id          Int      @id @default(autoincrement())
  lifeAreaId  Int
  title       String
  timePeriod  String   -- free text: "2026", "Q2 2026", etc.
  notes       String?
  createdAt   DateTime @default(now())
  milestones  Milestone[]
  habitLinks  GoalHabitLink[]

Milestone
  id          Int      @id @default(autoincrement())
  goalId      Int
  title       String
  completedAt DateTime?  -- null = incomplete

GoalHabitLink
  id        Int  @id @default(autoincrement())
  goalId    Int
  habitId   Int
  -- references existing Habit model
```

## Progress Calculation

- **Milestone progress** = completed milestones ÷ total milestones (0 if no milestones)
- **Habit progress** = average monthly completion rate across all linked habits (current calendar month)
- **Blended progress**:
  - Both present: 60% milestone + 40% habit
  - Milestones only: 100% milestone progress
  - Habits only: 100% habit progress
  - Neither: 0%
- **Area progress** = average blended progress of all goals in the area

## Pages & Navigation

### `/goals` — Main page

- Grid of life area cards (2 columns on desktop)
- Each card shows: area name, color accent, goal count, area-level progress bar
- Clicking a card expands it in-place to show its goals beneath (accordion)
- "Add area" button opens a modal (name + color picker)
- Goals section header has an "Add goal" button

### Goal row (within expanded area)

- Title, time period badge, blended progress percentage + bar, expand chevron
- Clicking the row expands milestones inline beneath it
- Edit/delete via a `⋯` menu on the row

### Expanded goal (inline)

- Milestone checklist: tick to complete, add milestone inline, delete via `×`
- Linked habits section: habit chips showing name + monthly completion %; remove link via `×`
- "Link habit" button opens a dropdown/search of existing habits
- Notes field (single text area, auto-saved on blur)

### Modals

- **Create/edit goal**: title, time period, life area (pre-selected if opened from area), notes
- **Create/edit area**: name, color (chosen from a preset palette of ~8 swatches)

## Sidebar

Add "Goals" entry to the existing sidebar navigation between Habits and Weekly Review.

## Out of Scope

- Goal archiving / history view (can be added later)
- Notifications or reminders for goal deadlines
- Goal sharing or export
