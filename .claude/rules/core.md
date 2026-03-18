# Core Rules (Always Loaded)

## Rules 0-9

0. **PAUSE BEFORE CODE** — check existing cards, argue against, then create card
1. **CARD FIRST** — every code change needs a card (traceability)
2. **ATOMIC COMMITS** — code + card together
3. **@card IN CODE** — link implementation to card for searchability
4. **USE AGENT TEAMS** — for any non-trivial task (7.5x proven)
5. **USE useOrgStore for ORQ** — never parse localStorage manually
6. **COLLECTION VIEWER FIRST** — `/collection/[name]` before any DB work
7. **REDIRECT to /app not /** — all "home" buttons go to `/app`
8. **ARGUE AGAINST FIRST** — before proposing new fields/files/patterns, explain why NOT to
9. **DOCS FIRST** — glob `docs/**/` for existing knowledge before exploring code

## Rule 0 Process (HARD GATE)

1. `grep docs/cards/` for existing card covering this work
2. If found → state which CARD-XXX you're updating
3. If not found → "Arguments against: [reasons]", then create CARD-XXX
4. Only after card identified → write code with `@card CARD-XXX`

## Enforcement Hierarchy

Prefer structural enforcement: **types > guards > lints > hooks > rules files > monolith docs**

If a fix touches N>2 call sites, the fix is in the wrong place — push it down a layer.

## Three-Layer Consistency

When changing any pattern → update Data (DB/seed) + Code + Docs, or the fix is incomplete.
