import { StarboardPlugin } from "starboard-notebook/dist/src/types";
import { registerGraderCellType } from "./cellType";
import { registerStudentLockedCellProperty } from "./lockedProperty";

export {GraderCellHandler, registerGraderCellType} from "./cellType";

// @ts-ignore
import css from "./styles.css";

export function initPlugin() {
    registerGraderCellType();
    registerStudentLockedCellProperty();

    const styleSheet = document.createElement("style")
    styleSheet.id = "nbgrader-styles";
    styleSheet.innerHTML = css
    document.head.appendChild(styleSheet)
}

export const plugin: StarboardPlugin = {
    id: "starboard-nbgrader",
    metadata: {
        name: "Starboard NBGrader Plugin"
    },
    exports: {},
    async register() {
        initPlugin();
    }
}
