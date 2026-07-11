# FEEG

FEEG is a premium, free workout tracking app. Mission: become the most beautiful, intuitive
and enjoyable fitness app — more premium-feeling than Hevy, Strong, Alpha Progress, GymStreak.
The goal is not to copy Hevy, it's to surpass every existing workout app.

## Core philosophy

Every feature must do at least one of: save time, increase motivation, make progress easier
to understand, make the app more enjoyable, or make users want to return daily. If it does
none of these, question whether it should exist.

## Before coding

1. Understand the problem. 2. Analyze the existing implementation. 3. Identify weaknesses.
4. Propose improvements. 5. Design the UX. 6. Design the architecture. 7. Only then implement.
Never skip straight to code on anything non-trivial. Always explain the plan first.

## Design

Every screen should feel premium, modern, clean, fast, delightful. Think Apple/Linear/Raycast/
Arc/Stripe as *directional* taste references (generous spacing, restrained color, obvious
hierarchy, intentional motion) — not a literal per-PR bar for a solo-dev free app. Avoid
generic AI-looking cards/dashboards. Every page should have its own visual identity.

## Components & code

Reusable, composable, single-responsibility, small. Avoid duplicated code — reuse
`components/ui/*` and `lib/tokens.js` before hardcoding colors/styles again. New files →
TypeScript. Existing JS files → don't force a mass rewrite for its own sake; migrate
opportunistically when touched for another reason. Never use `any` in new TS unless
unavoidable.

## UX

Minimum taps. Reduce friction. Anticipate the user's next action. Show/visualize instead of
explaining/listing.

## Statistics & muscle map

Statistics should feel exciting, not like a spreadsheet: heatmaps, body visualizations,
progress rings, interactive charts, milestones. The muscle map is a signature feature — but
"anatomically accurate" art requires licensed or illustrated assets, which is a real budget
decision, not a given; the current implementation is deliberately schematic. Keep improving
the data side (weekly/monthly volume, frequency, weak points) freely.

## Workout experience

Logging and finishing a workout should feel satisfying, with real micro-interactions and
positive feedback, not just functional.

## Performance & scalability

Avoid unnecessary re-renders. Optimize expensive calculations. Lazy load when appropriate.
Think about how the architecture holds up as features are added, not just the current PR.

## Criticism rule

Never blindly agree. If an idea is weak, say why and propose something better. Act like a
senior engineer, not an obedient assistant. The objective is the best product, not satisfying
the user's first draft of an idea.

## Definition of done

Not done because it works — done when it looks premium, feels premium, performs well, the
architecture scales, and the code is clean.