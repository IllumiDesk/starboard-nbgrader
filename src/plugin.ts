import { Runtime, StarboardPlugin } from "starboard-notebook/dist/src/types";
import { registerGraderCellType } from "./cellType";
import { StarboardGraderBar } from "./elements/graderBar";
import { JupyterPluginSettings } from "./jupyter";
import { registerStudentLockedCellProperty } from "./lockedProperty";

export { GraderCellHandler, registerGraderCellType } from "./cellType";

// @ts-ignore
import css from "./styles.css";

export type GraderPluginOpts = {
  jupyter: JupyterPluginSettings;
  jupyterPluginUrl?: string;
};

export const plugin: StarboardPlugin = {
  id: "starboard-nbgrader",
  metadata: {
    name: "Starboard NBGrader",
  },
  exports: {},
  async register(runtime: Runtime, opts: GraderPluginOpts = { jupyter: {} }) {
    const topbar = new StarboardGraderBar(opts, runtime);
    const nb = document.querySelector("starboard-notebook");
    if (nb) nb.prepend(topbar);

    registerGraderCellType();
    registerStudentLockedCellProperty();

    const styleSheet = document.createElement("style");
    styleSheet.id = "nbgrader-styles";
    styleSheet.innerHTML = css;
    document.head.appendChild(styleSheet);
  },
};
