import { registerGraderCellType } from "./cellType";
import { registerStudentLockedCellProperty } from "./lockedProperty";

export {GraderCellHandler, registerGraderCellType} from "./cellType";

export function initPlugin() {
    registerGraderCellType();
    registerStudentLockedCellProperty();
}
