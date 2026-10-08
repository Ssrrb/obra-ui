import type { StorybookConfig } from '@storybook/web-components-vite';

/**
 * Storybook runs the framework-free @obra/ui custom elements in a browser:
 * fast feedback for every component state and theme. It is NOT the merge gate
 * — important workflows must still run in the real Code OSS host
 * (design/PRINCIPLES.md rule 10).
 *
 * Stories live with the components they document (`packages/obra-ui/stories/`),
 * one CSF file per production component, titled to match the Penpot/story
 * paths in `design/penpot-map.json`.
 */
const config: StorybookConfig = {
  stories: [
    '../../obra-ui/stories/**/*.stories.@(ts|js)',
    '../stories/**/*.stories.@(ts|js)',
  ],

  addons: ['@storybook/addon-themes', '@storybook/addon-a11y'],

  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },

  core: {
    disableTelemetry: true,
  }
};

export default config;
