# Queue UI update

## Design direction

A daylight hospitality workspace: white as the main background, green accents, translucent navigation and panels, a restrained serif for editorial headings, and compact system typography for operational details. No generated photography, neon gradients, sparkle marks, or decorative meal-image placeholders.

## What changed

- Rebuilt the landing page and restaurant/guest sign-in and registration screens with consistent branding, explicit labels, autocomplete, loading, and error states.
- Rebuilt the sidebar and workspace header. Mobile navigation hides inactive controls, traps focus while open, restores focus and scroll behavior on close, and supports Escape.
- Reworked the service overview around readable queue rows, always-visible actions, real counts, in-service parties, and reservations. Removed hardcoded percentage improvements. Event updates refresh server counts rather than relying solely on local increments.
- Replaced the neon queue tracker with a readable digital ticket, restaurant identity, visit progress, estimated wait, QR access, and a clear leave confirmation. Matching resource tokens and authorized live-room subscriptions are preserved. A periodic refresh supplements live updates.
- Updated the guest palette across the existing join, booking, ordering, and customer screens. The meal menu uses category labels, item descriptions, and accessible add/remove controls rather than generic image placeholders.
- Added visible keyboard focus states, reduced-motion CSS, and responsive layouts. Improved text contrast against the paper palette.

## Verification

- Production frontend build passed; the existing large-chunk warning remains.
- Targeted ESLint passed for the rewritten layout, landing, auth, dashboard, tracker, and route components. This does not assert that unrelated legacy pages pass repository-wide lint.
- In-browser: restaurant sign-in, guest signup, signed QR join, ticket QR expansion, leave-dialog cancellation, live approval, seating and completion all worked.
- In-browser: the redesigned meal menu accepted an item, opened its cart, and placed a local test order that reached the tracking screen.
- Responsive review at desktop and a 390px mobile viewport. The mobile workspace did not overflow horizontally; drawer opening, Escape dismissal, and focus return were checked.
- The earlier backend security/regression work was preserved. No production deployment was performed.

## Preview

The local app is at http://localhost:5173. Demo admin: admin@test.com / admin123. Synthetic guest and reservation fixtures were added only to the disposable QA database during local UI verification so populated states could be reviewed. These are demonstration records, not real usage or performance measurements.

Global styling lives in `frontend/src/app/styles/`, with shared Tailwind tokens in `index.css` and component styles in `queue-design.css`. Screens now live in domain-specific `frontend/src/features/*/pages/` folders.

Desktop, mobile, and guest-ticket screenshots are saved in this chat's visualization output folder as queue-redesign-desktop.png, queue-redesign-mobile.png, and queue-redesign-ticket.png.

## White-and-green responsive refinement

The base is now white with green actions and pale green supporting surfaces. Added compact-phone rules for queue actions and ticket layouts, scrollable settings tabs, two-row opening-hours controls, wrapping calendar entries, and touch-friendly inputs. Production build passed. Chrome opening was interrupted; these latest refinements have not yet been visually verified there.
