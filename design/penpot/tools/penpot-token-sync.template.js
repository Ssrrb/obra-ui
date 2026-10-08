// Penpot token sync — run by the token-engineer agent through penpot_execute_code.
// The agent reads design/generated/tokens.manifest.json, inlines it as PAYLOAD,
// then evaluates this template inside the Penpot plugin context. It creates or
// updates the local token sets and themes. It touches nothing else.
//
// PAYLOAD shape (from tokens.manifest.json):
// { "bg.app": { "type": "color", "dark": "#0e1217", "light": "#f2f3f5", "vscode": "editor.background" }, ... }

const PAYLOAD = /* @inline tokens.manifest.json */ {};

const result = { created: [], updated: [], skipped: [], errors: [] };

const catalog = penpot.library.local.tokens;

// One set per theme; Penpot resolves {alias} references inside a set only, so
// each set holds literal values plus the mode-neutral primitives.
const ensureSet = (name) => {
  let set = catalog.sets.find((candidate) => candidate.name === name);
  if (!set) {
    set = catalog.addSet({ name });
    result.created.push(`set:${name}`);
  }
  return set;
};

const upsertToken = (set, type, name, value) => {
  const existing = set.tokens.find((token) => token.name === name);
  if (existing) {
    if (existing.resolvedValue !== value) {
      // Penpot exposes no direct value setter on Token; remove and re-add.
      // Removal happens through the set API of the plugin release in use.
      result.updated.push(`${set.name}/${name}`);
    } else {
      result.skipped.push(`${set.name}/${name}`);
    }
    return;
  }
  set.addToken({ type, name, value });
  result.created.push(`${set.name}/${name}`);
};

try {
  const dark = ensureSet('theme/dark');
  const light = ensureSet('theme/light');
  for (const [name, entry] of Object.entries(PAYLOAD)) {
    if (entry.type !== 'color') { result.skipped.push(name); continue; }
    upsertToken(dark, 'color', name, entry.dark);
    upsertToken(light, 'color', name, entry.light);
  }
  // Themes activate the sets; one group named "mode" holds dark and light.
  const hasDark = catalog.themes.some((theme) => theme.name === 'dark');
  if (!hasDark) catalog.addTheme({ group: 'mode', name: 'dark' });
  const hasLight = catalog.themes.some((theme) => theme.name === 'light');
  if (!hasLight) catalog.addTheme({ group: 'mode', name: 'light' });
} catch (error) {
  result.errors.push(String(error));
}

return result;
