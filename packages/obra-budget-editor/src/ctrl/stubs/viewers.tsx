/**
 * ctrl build stand-ins for the 3D IFC viewer and the PDF viewer (see the
 * `ctrlStubs` plugin in vite.ctrl.config.ts). Both tabs are hidden in ctrl
 * (VITE_HIDE_EXPERIMENTAL); the real viewers pull in three/@thatopen, load
 * web-ifc wasm from unpkg.com and start workers, none of which a strict
 * webview CSP allows. The upstream components stay untouched.
 */
export function ThreeDViewer() {
  return null;
}

export function PdfViewer() {
  return null;
}
