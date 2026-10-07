import type { Preview } from '@storybook/web-components';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import { defineObraUI } from '@obra/ui';

// The generated literal token layer. This is the *dark* layer: it holds the
// resolved --obra-* values used when there is no VS Code host. Light and
// high-contrast preview layers override those tokens in `preview.css`.
import '@obra/ui/tokens.css';
import './preview.css';

// Register every Obra custom element exactly once, before any story renders.
defineObraUI();

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    // The workbench paints its own token surface (preview.css); Storybook's
    // independent background switcher would fight the theme layers.
    backgrounds: { disable: true },
    a11y: {
      // Fail the addon panel on real violations; warnings stay visible.
      config: {},
      options: {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      },
    },
  },
  decorators: [
    // Toolbar switcher. Sets `data-obra-theme` on <html>, which the token
    // layers in preview.css and the component forced-colors rules react to.
    withThemeByDataAttribute({
      themes: {
        Light: 'light',
        Dark: 'dark',
        HighContrast: 'high-contrast',
      },
      defaultTheme: 'dark',
      attributeName: 'data-obra-theme',
    }),
  ],
};

export default preview;
