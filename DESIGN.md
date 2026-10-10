# HTC DESIGN.md v1
Holic Traders Company — Trial Visual System

## 1. Purpose

This document is the visual source of truth for the HTC Trial public/user experience.

All UI implementation, refinement, accessibility review, and browser validation must follow this document unless an explicit HTC task says otherwise.

If any skill, plugin, library, generated suggestion, or design recommendation conflicts with this file or the HTC PRD, HTC rules take priority.

---

## 2. Product Character

HTC should feel:

- educational
- trustworthy
- calm
- intentional
- modern
- structured
- premium without excess
- human, not synthetic
- professional, not corporate-generic
- approachable without becoming playful or childish

HTC must NOT feel like:

- a generic AI startup
- a crypto landing page
- a SaaS template
- a trading signal website
- a hype-driven finance site
- an LMS dashboard during Trial
- a design showcase with no product purpose

---

## 3. Core Visual Principle

Purpose before decoration.

Every visible element must have a clear product or communication function.

Do not add visual elements merely to make the page appear more complete.

Prefer restraint, hierarchy, spacing, typography, and composition over visual effects.

---

## 4. No AI Slop Rule

Strictly avoid:

- excessive gradients
- unnecessary glow
- generic glassmorphism
- excessive blur
- card-everywhere layouts
- oversized generic hero text
- random icon usage
- fake dashboards
- fake analytics
- fake testimonials
- fake user activity
- filler sections
- decorative animations without function
- meaningless badges
- generic startup slogans
- repeated rounded cards for every piece of information
- random visual patterns generated only for novelty
- over-designed empty states
- speculative product features

Do not generate fake HTC content to fill layouts.

When content is unavailable, use honest empty states.

---

## 5. HTC Trial Boundary

September–December 2026 is Trial.

The public/user interface must NOT imply that HTC currently provides:

- full curriculum
- Beginner Curriculum
- courses
- lessons
- quizzes
- assessments
- enrollment
- learning progress
- certificates
- LMS dashboard

Trial presentation should focus on:

- HTC introduction
- educational / introductory content
- content discovery
- public reading experience
- clear Trial positioning

Official curriculum begins January 2027.

---

## 6. Information Hierarchy

Prioritize:

1. clear page purpose
2. primary content
3. supporting context
4. navigation
5. secondary actions
6. decorative elements

Pages must be understandable without relying on animation or decorative visuals.

Use whitespace intentionally.

Avoid dense visual clusters.

---

## 7. Typography

Typography should prioritize readability and editorial clarity.

Rules:

- use a limited type scale
- clear distinction between heading and body text
- comfortable reading width for long-form content
- avoid extremely large display text unless justified
- avoid excessive font-weight variation
- avoid decorative fonts for body copy
- keep line-height comfortable
- use consistent paragraph spacing

Do not introduce multiple font families without a documented reason.

---

## 8. Layout

Use structured responsive layouts.

Preferred behavior:

- clear max-width content containers
- predictable spacing
- strong vertical rhythm
- intentional alignment
- minimal nested card structures
- mobile-first resilience

Avoid:

- arbitrary asymmetry
- layout shifts for decoration only
- excessive overlapping elements
- horizontal overflow
- unnecessarily complex grids

---

## 9. Components

Components must be reusable only when reuse is real.

Do not create abstractions prematurely.

Prefer:

- simple buttons
- clear links
- readable content lists
- straightforward metadata
- purposeful media blocks
- predictable navigation

Avoid creating a component system larger than T10 requires.

---

## 10. Navigation

Navigation must be minimal and truthful.

Only show real destinations.

No placeholder links.

No dead links.

No Founder/Admin controls in normal public/user navigation.

Authentication state should be clear but visually quiet.

---

## 11. Content Discovery

Public content listing should emphasize:

- title
- useful metadata
- content type/category where real
- thumbnail/media only where it improves understanding
- clear path to detail view

Do not turn every content item into a heavily styled marketing card.

Prefer scannability.

---

## 12. Content Detail

Content detail must optimize for reading.

Prioritize:

- title
- relevant metadata
- readable body
- appropriate media
- clear navigation back to discovery

Avoid unnecessary sidebars, floating widgets, or unrelated recommendation blocks unless explicitly required.

---

## 13. UI States

Required states should be intentional:

- loading
- empty
- error
- not found
- unauthenticated
- unauthorized

States must be:

- concise
- clear
- honest
- non-dramatic

Do not add decorative illustrations unless they serve a real purpose.

---

## 14. Interaction

Interaction should be predictable.

Use animation only when it helps:

- orientation
- state transition
- feedback
- navigation understanding

Avoid:

- gratuitous motion
- parallax
- excessive hover animation
- constantly moving UI
- animation that delays content access

---

## 15. Accessibility

Follow accessible web fundamentals:

- semantic HTML
- logical heading order
- keyboard access
- visible focus states
- meaningful labels
- sufficient contrast
- appropriate alt text
- no hover-only interaction
- accessible form states
- meaningful link/button text

Accessibility is part of design quality, not a final polish step.

---

## 16. Responsive Behavior

Validate at minimum:

- mobile
- tablet
- desktop

Ensure:

- no horizontal overflow
- navigation remains usable
- content remains readable
- touch targets remain usable
- media does not break layout
- spacing remains proportional

---

## 17. Performance

Prefer:

- minimal client-side JavaScript
- efficient rendering
- bounded data loading
- optimized media behavior
- no unnecessary animation libraries
- no unnecessary UI frameworks

Do not add runtime dependencies for visual convenience alone.

---

## 18. Skill Roles

### Frontend Design
Role:
implementation and visual composition

Must:
follow DESIGN.md

Must not:
invent product scope

### Design Taste Frontend
Role:
anti-slop visual critic and refinement layer

Must:
improve hierarchy, composition, restraint, and intentionality

Must not:
force a visual style that conflicts with HTC

### Web Design Guidelines
Role:
UX, accessibility, interaction, and web-quality review

Must:
flag usability and accessibility issues

Must not:
override HTC product scope

### Playwright CLI
Role:
browser validation

Use for:
- navigation testing
- viewport testing
- interaction testing
- visual verification
- error state verification
- responsive checks

Must not:
modify product behavior unless explicitly instructed

---

## 19. Design Decision Rule

When unsure whether to add an element:

1. Does it support a real user goal?
2. Is it required by the task?
3. Does it improve clarity?
4. Does it preserve HTC Trial boundaries?
5. Can the same result be achieved more simply?

If the answer is unclear:
do not add it.

---

## 20. Final Standard

The HTC Trial interface should look like it was designed deliberately by a human product team.

Not generated.

Not overdecorated.

Not template-driven.

Not trying to impress through excess.

Clarity, restraint, consistency, and trust come first.