import { registerGraderCellType } from "./cellType";

export {GraderCellHandler, registerGraderCellType} from "./cellType";

export function initPlugin() {
    registerGraderCellType();
}
