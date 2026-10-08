/** Register every Obra custom element exactly once. Call before first render. */
export function defineObraUI(): void {
  defineButton();
  defineIconButton();
  defineTextField();
  defineTextArea();
  defineCheckbox();
  defineRadioGroup(); defineRadio();
  defineSelect(); defineOption();
  defineBadge();
  defineTag();
  defineLink();
  defineDivider(); defineSpinner(); defineProgress();
  defineTabs(); defineTab(); defineTabPanel();
  defineTooltip();
  defineMenu(); defineMenuItem();
  // patterns
  defineSectionHeader(); defineEmptyState(); defineErrorState(); defineLoadingState();
  defineFormField(); definePropertyRow(); defineToolbar(); defineFilterBar();
  defineDataTable();
  defineMasterDetail();
  defineConfirmationDialog();
  // layouts
  defineStack();
}

// foundations
export { ObraElement, ensureTokens } from './foundations/element.js';
export { BASE_CSS, FOCUS_CSS, DISABLED_CSS, MOTION_CSS, SPIN_CSS } from './foundations/styles.js';
export { rovingIndex, applyRovingTabindex, Keys } from './foundations/a11y.js';
export type { Direction } from './foundations/a11y.js';

// primitives
export { ObraButton, defineButton } from './primitives/button.js';
export type { ButtonVariant } from './primitives/button.js';
export { ObraIconButton, defineIconButton } from './primitives/icon-button.js';
export { ObraTextField, defineTextField, ObraTextArea, defineTextArea } from './primitives/text-field.js';
export { ObraCheckbox, defineCheckbox } from './primitives/checkbox.js';
export { ObraRadioGroup, defineRadioGroup, ObraRadio, defineRadio } from './primitives/radio.js';
export { ObraSelect, defineSelect, ObraOption, defineOption } from './primitives/select.js';
export { ObraBadge, defineBadge } from './primitives/badge.js';
export { ObraTag, defineTag } from './primitives/tag.js';
export { ObraLink, defineLink } from './primitives/link.js';
export { ObraDivider, defineDivider, ObraSpinner, defineSpinner, ObraProgress, defineProgress } from './primitives/feedback.js';
export { ObraTabs, defineTabs, ObraTab, defineTab, ObraTabPanel, defineTabPanel } from './primitives/tabs.js';
export { ObraTooltip, defineTooltip } from './primitives/tooltip.js';
export { ObraMenu, defineMenu, ObraMenuItem, defineMenuItem } from './primitives/menu.js';

// patterns
export { ObraSectionHeader, defineSectionHeader, ObraEmptyState, defineEmptyState, ObraErrorState, defineErrorState, ObraLoadingState, defineLoadingState } from './patterns/states.js';
export { ObraFormField, defineFormField, ObraPropertyRow, definePropertyRow, ObraToolbar, defineToolbar, ObraFilterBar, defineFilterBar } from './patterns/form.js';
export { ObraDataTable, defineDataTable } from './patterns/data-table.js';
export type { DataTableColumn, DataTableStatus } from './patterns/data-table.js';
export { ObraMasterDetail, defineMasterDetail } from './patterns/master-detail.js';
export { ObraConfirmationDialog, defineConfirmationDialog } from './patterns/confirmation-dialog.js';

// layouts
export { ObraStack, defineStack } from './layouts/stack.js';

import { defineButton } from './primitives/button.js';
import { defineIconButton } from './primitives/icon-button.js';
import { defineTextField, defineTextArea } from './primitives/text-field.js';
import { defineCheckbox } from './primitives/checkbox.js';
import { defineRadioGroup, defineRadio } from './primitives/radio.js';
import { defineSelect, defineOption } from './primitives/select.js';
import { defineBadge } from './primitives/badge.js';
import { defineTag } from './primitives/tag.js';
import { defineLink } from './primitives/link.js';
import { defineDivider, defineSpinner, defineProgress } from './primitives/feedback.js';
import { defineTabs, defineTab, defineTabPanel } from './primitives/tabs.js';
import { defineTooltip } from './primitives/tooltip.js';
import { defineMenu, defineMenuItem } from './primitives/menu.js';
import { defineSectionHeader, defineEmptyState, defineErrorState, defineLoadingState } from './patterns/states.js';
import { defineFormField, definePropertyRow, defineToolbar, defineFilterBar } from './patterns/form.js';
import { defineDataTable } from './patterns/data-table.js';
import { defineMasterDetail } from './patterns/master-detail.js';
import { defineConfirmationDialog } from './patterns/confirmation-dialog.js';
import { defineStack } from './layouts/stack.js';
