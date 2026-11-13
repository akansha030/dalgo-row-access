# Dalgo — Row access prototype

A clickable prototype of **Row access** (row-level security) for Dalgo: let each member
see only their own rows on shared dashboards. This is the recent React build, lifted out of
the product into a standalone app — **the Access pages only**, running on **mock data** (no
backend, nothing live).

**Live demo:** https://akansha030.github.io/dalgo-row-access/

## What's in it

The **Row access** tab walks the full flow:

1. **Set up** — upload a CSV of who-sees-what (+ a downloadable template).
2. **Columns Dalgo will use** — read-only; Dalgo reads the column names straight from the file.
3. **Preview** — a who-sees-what table (expand a row to see the tables they query and the
   dashboards they can open, and preview any dashboard exactly as that member sees it) beside a
   tiered **Needs attention** panel. Save is gated until the critical items are fixed.
4. **Saved** — the live state: the attached file, a summary line, and the member list.

People / Groups / Roles are shown as placeholders — the prototype focuses on Row access.

## Notes

- Built from the real product components (Tailwind v4, Radix, the product's design tokens), so
  it looks and behaves like Dalgo.
- All data is mock (the ATECF district · taluka · dam_id example). Nothing is sent anywhere.

## Run locally

```bash
npm install
npm run dev
```

Build the static site (outputs to `docs/`, which GitHub Pages serves):

```bash
npm run build
```
