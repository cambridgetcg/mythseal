/** True only inside a Capacitor native shell: its bridge defines window.Capacitor before
 * page scripts run. Browsers, previews and Node have no bridge, so they get false. */
export function isNativeShell(scope = globalThis) {
  try { return scope?.Capacitor?.isNativePlatform?.() === true; }
  catch { return false; }
}
