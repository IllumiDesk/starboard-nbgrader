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
