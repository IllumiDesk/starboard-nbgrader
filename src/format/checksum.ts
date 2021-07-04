import md5 from "js-md5";
import { Cell } from "starboard-notebook/dist/src/types";
import { isGrade, isLocked, isSolution, pyBoolStr, pyFloatStr, toBytes } from "./utils";

/**
 * Mirrors https://github.com/jupyter/nbgrader/blob/master/nbgrader/utils.py#L157
 *
 * Note that the checksum of a cell without a nbgrader field is unspecified in python's nbgrader (it errors).
 * @param cell
 */
export function computeGraderCellChecksum(cell: Cell) {
  const c = md5.create();
  c.update(toBytes(/*source*/ cell.textContent));

  // Maybe todo: original cell type may not be set?
  c.update(toBytes(cell.metadata.starboard_grader.original_cell_type === "markdown" ? "markdown" : "code"));

  c.update(toBytes(pyBoolStr(isGrade(cell))));
  c.update(toBytes(pyBoolStr(isSolution(cell))));
  c.update(toBytes(pyBoolStr(isLocked(cell))));

  c.update(toBytes(cell.metadata.nbgrader.grade_id));

  if (isGrade(cell)) {
    c.update(toBytes(pyFloatStr(cell.metadata.nbgrader.points)));
  }

  return c.hex();
}
