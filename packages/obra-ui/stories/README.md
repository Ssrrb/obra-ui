# Stories

Storybook stories live here (Phase 5). Convention: one file per component,
named `<component>.stories.ts`, exporting a CSF default with `title` matching
the Penpot/story path in `design/penpot-map.json` (e.g. `Primitives/Button`).

Every production primitive and pattern must have a story covering each state it
defines: default, disabled, loading, focus-visible, extreme content, light /
dark / high-contrast themes. See `.agents/skills/better-ui` for the motion and
polish values the stories must demonstrate.
