/** The Capacitor seam for the store apps (docs/IOS-FIRST-FLIGHT.md): is this page inside the
 * native shell, a file the player can save, and a durable copy of the journey. No imports, so
 * bootstrap.mjs can load it even when the game itself failed to load.
 *
 * How plugins are reached without @capacitor/core (checked against @capacitor/ios 8.5.3, whose
 * JSExport.swift, CapacitorBridge.swift and WebViewDelegationHandler.swift are identical to
 * 8.5.2's): when the bridge starts, CapacitorBridge.init adds WKUserScripts at document start,
 * in this order: `window.Capacitor = { …, Plugins: {} }` (JSExport.exportCapacitorGlobalJS),
 * then native-bridge.js, which keeps that object (`const cap = win.Capacitor || {}`) and adds
 * isNativePlatform() and nativePromise(), then, for every plugin registered from the
 * capacitor.config.json that `cap sync` writes (packageClassList), JSExport.exportJS, which sets
 * `window.Capacitor.Plugins[jsName]` to an object with one function per native method, each
 * `return w.Capacitor.nativePromise(jsName, method, _options)`. So the page's own un-bundled
 * modules can call `window.Capacitor.Plugins.Filesystem.writeFile({…})` directly; nothing from
 * @capacitor/core or the plugins' JS packages needs vendoring. Those npm packages are still
 * needed at build time: `cap sync` finds native plugins through package.json (devDependencies
 * count) and writes them into CapApp-SPM/Package.swift and the generated capacitor.config.json.
 * Not run in a WKWebView yet: this is read from source, and the tests use a fake bridge. */

/** True only inside a Capacitor native shell: its bridge defines window.Capacitor before
 * page scripts run. Browsers, previews and Node have no bridge, so they get false. */
export function isNativeShell(scope = globalThis) {
  try { return scope?.Capacitor?.isNativePlatform?.() === true; }
  catch { return false; }
}

/** The bridge's plugin objects (window.Capacitor.Plugins), or null outside the native shell. */
export function nativePlugins(scope = globalThis) {
  if (!isNativeShell(scope)) return null;
  try { return scope.Capacitor.Plugins ?? null; } catch { return null; }
}

/** A share sheet the player closed without choosing anything: not a failure, nothing saved. */
export class SaveCancelled extends Error {
  constructor() { super('已取消匯出；本機旅程未有更改。'); this.name = 'SaveCancelled'; this.code = 'cancelled'; }
}
const EXPORT_DIRECTORY = 'CACHE';
const exportPath = name => `exports/${String(name).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')}`;

/** Give the player a file. On the web, a Blob and an anchor download, exactly as D2 did; the
 * click happens before this function first awaits, so it stays inside the tap. In the app, Blob
 * downloads do nothing (WKWebView has no download UI and Capacitor's navigation handler sends a
 * blob: URL to the system, which cannot open it), so the text is written to the app's Cache
 * directory with the Filesystem plugin and offered through the Share plugin's sheet, where the
 * player can Save to Files, AirDrop or send it. Resolves { via: 'download' } or
 * { via: 'share', activityType }; a dismissed sheet rejects with SaveCancelled. */
export async function saveFile({ name, text, mime = 'application/json' }, {
  scope = globalThis, document = globalThis.document, URL: urls = globalThis.URL, Blob: BlobType = globalThis.Blob, setTimeout: later = globalThis.setTimeout,
} = {}) {
  const plugins = nativePlugins(scope);
  if (!plugins) {
    const url = urls.createObjectURL(new BlobType([text], { type: mime })), link = document.createElement('a');
    link.href = url; link.download = name; link.click(); later(() => urls.revokeObjectURL(url), 1000);
    return { via: 'download' };
  }
  const { Filesystem, Share } = plugins;
  if (typeof Filesystem?.writeFile !== 'function' || typeof Share?.share !== 'function') throw Error('此版本未能匯出檔案；本機旅程未有更改。');
  const { uri } = await Filesystem.writeFile({ path: exportPath(name), data: text, directory: EXPORT_DIRECTORY, encoding: 'utf8', recursive: true });
  try {
    const shared = await Share.share({ title: name, files: [uri] });
    return { via: 'share', activityType: typeof shared?.activityType === 'string' ? shared.activityType : '' };
  } catch (error) {
    // SharePlugin.swift rejects "Share canceled" when the sheet closes without an activity.
    if (/cancel/i.test(String(error?.message ?? error))) throw new SaveCancelled();
    throw error;
  }
}

/** A copy of the journey in the app's own files (the Library directory, which iOS keeps and
 * backs up), because iOS may clear a WKWebView's localStorage and IndexedDB under storage
 * pressure (Capacitor's storage guide). It is a mirror, never the source: the game still reads
 * and writes localStorage, and a copy is only ever restored through D2's strict restore.
 * Writes go to `next` and are then renamed over `path`, so an interrupted write never leaves a
 * torn copy (the plugin writes strings non-atomically); a read falls back to `next` if the
 * rename was cut short. Writes are serialized and coalesced: the latest text wins. Null outside
 * the native shell or without the Filesystem plugin. */
export const MIRROR_DIRECTORY = 'LIBRARY';
export const MIRROR_PATH = 'mythseal/journey.v5.json';
export function createDurableMirror({ scope = globalThis, directory = MIRROR_DIRECTORY, path = MIRROR_PATH, now = () => new Date() } = {}) {
  const fs = nativePlugins(scope)?.Filesystem;
  if (typeof fs?.writeFile !== 'function') return null;
  const next = `${path}.next`;
  let pending = null, running = null, status = { state: 'idle', at: null, error: null };
  async function drain() {
    while (pending !== null) {
      const text = pending; pending = null;
      try {
        await fs.writeFile({ path: next, data: text, directory, encoding: 'utf8', recursive: true });
        await fs.rename({ from: next, to: path, directory, toDirectory: directory });
        status = { state: 'saved', at: new Date(now()).toISOString(), error: null };
      } catch (error) {
        status = { state: 'error', at: status.at, error: String(error?.message ?? error) };
      }
    }
    running = null;
  }
  return {
    /** Queue `text` as the copy; resolves once it, or a later text, has been tried. Never rejects. */
    write(text) {
      if (typeof text !== 'string') return running ?? Promise.resolve();
      pending = text;
      running ??= Promise.resolve().then(drain);
      return running;
    },
    /** The copy's text, or null when there is none or it cannot be read. Never rejects. */
    async read() {
      for (const candidate of [path, next]) {
        try {
          const { data } = await fs.readFile({ path: candidate, directory, encoding: 'utf8' });
          if (typeof data === 'string' && data) return data;
        } catch {}
      }
      return null;
    },
    /** Move a copy the strict restore refused out of the way, kept for support, so the new
     * journey's saves never overwrite it. Resolves the name it was kept under. */
    async setAside(stamp = new Date(now()).toISOString()) {
      const kept = `${path.replace(/\.json$/, '')}.refused-${stamp.replace(/[^0-9TZ]/g, '')}.json`;
      // The copy read() returned: `path`, or `next` when an interrupted rename left only that.
      try { await fs.rename({ from: path, to: kept, directory, toDirectory: directory }); }
      catch { await fs.rename({ from: next, to: kept, directory, toDirectory: directory }); }
      return kept;
    },
    status: () => ({ ...status }),
  };
}

/** localStorage, with every successful write of `key` also queued to the mirror, unless
 * `held()` says the mirror must not change yet (a journey this device just started, before the
 * launch has decided whether to restore the copy). A failed localStorage write is never
 * mirrored: it throws first, exactly as before. */
export function mirroredStorage(storage, { key, mirror, held = () => false }) {
  return {
    getItem: name => storage.getItem(name),
    removeItem: name => storage.removeItem(name),
    setItem(name, value) {
      storage.setItem(name, value);
      if (name === key && mirror && !held()) mirror.write(value);
    },
  };
}
