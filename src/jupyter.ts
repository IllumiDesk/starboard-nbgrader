import type {plugin as JPlugin} from "starboard-jupyter/dist/index";
import type { JupyterPluginSettings } from "starboard-jupyter/dist/types";
import { Runtime } from "starboard-notebook/dist/src/types";

export type { JupyterPluginSettings } from "starboard-jupyter/dist/types";

declare const runtime: Runtime

let singletonPlugin: undefined | typeof JPlugin = undefined;

export async function registerJupyterPlugin(opts: JupyterPluginSettings, pluginUrl: string = "https://unpkg.com/starboard-jupyter@0.2.5/dist/index.js") {
    const {plugin} = await import(pluginUrl);
    singletonPlugin = plugin;
    return runtime.controls.registerPlugin(plugin, opts);
}

export function getJupyterPlugin() {
    return singletonPlugin;
}