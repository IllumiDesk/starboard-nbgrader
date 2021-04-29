import { StarboardPlugin } from "starboard-notebook/dist/src/types";
import { registerGraderCellType } from "./cellType";
import {  JupyterPluginSettings, registerJupyterPlugin } from "./jupyter";
import { registerStudentLockedCellProperty } from "./lockedProperty";

export {GraderCellHandler, registerGraderCellType} from "./cellType";

// @ts-ignore
import css from "./styles.css";

export const plugin: StarboardPlugin = {
    id: "starboard-nbgrader",
    metadata: {
        name: "Starboard NBGrader"
    },
    exports: {},
    async register(opts: {jupyter: JupyterPluginSettings, jupyterPluginUrl?: string} = {jupyter: {}}) {
        await registerJupyterPlugin(opts.jupyter, opts.jupyterPluginUrl);
        registerGraderCellType();
        registerStudentLockedCellProperty();

        const styleSheet = document.createElement("style")
        styleSheet.id = "nbgrader-styles";
        styleSheet.innerHTML = css
        document.head.appendChild(styleSheet)
    }
}
