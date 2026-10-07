#!/usr/bin/env node
/**
 * capture.mjs — stable screenshot capture for ui flows.
 *
 * Saves to <ui repo>/.tmp/captures/<flow>/<step>.png
 * (i.e. /Users/sebastian/Desktop/obra-studio/ui/.tmp/captures/...).
 *
 * Flow and step names are validated to prevent unintended paths:
 *   flow: /^[a-z0-9][a-z0-9-]*$/        (no slashes, dots, or traversal)
 *   step: /^[a-z0-9][a-z0-9._-]*$/      (no slashes or ".." segments)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HARNESS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HARNESS_DIR, '..', '..');

export const CAPTURES_ROOT = path.join(REPO_ROOT, '.tmp', 'captures');

const FLOW_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;
const STEP_NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;

export function validateFlowName(flow) {
  if (!FLOW_NAME_RE.test(flow)) {
    throw new Error(
      `Invalid flow name "${flow}". Flow names must match ${FLOW_NAME_RE} (lowercase letters, digits, hyphens; no slashes or dots).`,
    );
  }
  return flow;
}

export function validateStepName(step) {
  if (!STEP_NAME_RE.test(step)) {
    throw new Error(
      `Invalid capture step name "${step}". Step names must match ${STEP_NAME_RE} (lowercase letters, digits, dots, underscores, hyphens; no slashes).`,
    );
  }
  if (step.includes('..')) {
    throw new Error(`Invalid capture step name "${step}": ".." segments are not allowed.`);
  }
  return step;
}

/**
 * Capture `page` into `.tmp/captures/<flow>/<step>.png`.
 * Returns the absolute path of the saved screenshot.
 */
export async function capture({ page, flow, step }) {
  validateFlowName(flow);
  validateStepName(step);
  const dir = path.join(CAPTURES_ROOT, flow);
  await fs.promises.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${step}.png`);
  await page.screenshot({ path: file });
  return file;
}
