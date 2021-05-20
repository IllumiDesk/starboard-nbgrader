import { GraderCellType } from "./definitions";
import { NBGraderMetadata } from "./types";

export function graderMetadataToNBGraderCellType(m: NBGraderMetadata | undefined): GraderCellType {
  if (m === undefined) {
    // Default
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
    return "autograder-answer";
  } else if (m.grade && !m.solution && !m.task && m.locked) {
    return "autograder-tests";
  }
  console.error("Possibly invalid nbgrader cell metadata:", m);
  return "manual-answer";
}

// Can the given grader cell type be locked from editing by students?
export function graderCellTypeLockableness(gct: GraderCellType): "always" | "never" | "choice" {
  if (gct === "manual-answer" || gct === "autograder-answer") {
    return "never";
  } else if (gct === "manual-task" || gct === "autograder-tests") {
    return "always";
  } else {
    return "choice";
  }
}
