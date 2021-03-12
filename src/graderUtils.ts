import { NBGraderCellType } from "./cellType";
import { NBGraderMetadata } from "./types";

export function graderMetadataToNBGraderCellType(m: NBGraderMetadata | undefined): NBGraderCellType {
    if (m === undefined) { // Default
        return "manual-answer";
    }
    if (m.points === undefined) {
        return "autograder-answer";
    }

    if (m.grade && m.solution && !m.task && !m.locked) {
        return "manual-answer";
    } else if (!m.grade && !m.solution && m.task && m.locked) {
        return "manual-task";
    } else if (!m.grade && m.solution && !m.task && !m.locked) {
        return "autograder-answer"
    } else if (m.grade && !m.solution && !m.task && m.locked) {
        return "autograder-tests";
    }
    console.error("Possibly invalid nbgrader cell metadata:", m);
    return "manual-answer";
}

