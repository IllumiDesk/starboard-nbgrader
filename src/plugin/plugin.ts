import { Runtime, StarboardPlugin } from "starboard-notebook/dist/src/types";
import { registerGraderCellType } from "./cellType";
import { StarboardGraderBar } from "../elements/graderBar";
import { JupyterPluginSettings } from "./jupyter";

export { GraderCellHandler, registerGraderCellType } from "./cellType";

// @ts-ignore
import css from "./styles.css";
import { getGraderPluginMode, GraderPluginMode, setGraderPluginMode } from "./state";

export type GraderPluginOpts = {
  jupyter: JupyterPluginSettings;
  jupyterPluginUrl?: string;
  mode?: GraderPluginMode;
};

// Hide some cell types and properties
function hideFunctionalities(runtime: Runtime) {
  runtime.definitions.cellProperties.deregister("run_on_load");

  if (getGraderPluginMode() === "assignment-creator") {
    runtime.definitions.cellProperties.deregister("locked");
  }

  const types = [
    "javascript",
    "js",
    "python",
    "py",
    "pypy",
    "python3",
    "ipython3",
    "esm",
    "html",
    "css",
    "markdown",
    "md",
    "latex",
    "plaintext",
    "raw",
  ];
  types.forEach((t) => runtime.definitions.cellTypes.deregister(t));
}

export const plugin: StarboardPlugin = {
  id: "starboard-nbgrader",
  metadata: {
    name: "Starboard NBGrader",
  },
  exports: {},
  async register(runtime: Runtime, opts: GraderPluginOpts = { jupyter: { headerText: "" } }) {
    if (opts.mode) {
      setGraderPluginMode(opts.mode);
    }

    const topbar = new StarboardGraderBar(opts, runtime);
    const nb = document.querySelector("starboard-notebook");
    if (nb) nb.prepend(topbar);

    hideFunctionalities(runtime);

    registerGraderCellType();

    const styleSheet = document.createElement("style");
    styleSheet.id = "nbgrader-styles";
    styleSheet.innerHTML = css;
    document.head.appendChild(styleSheet);
  },
};
