import md5 from "js-md5";
import { Cell } from "starboard-notebook/dist/src/types";

const te = new TextEncoder();

function toBytes(val: string): Uint8Array {
  return te.encode(val);
}
/**
 * Mirrors https://github.com/jupyter/nbgrader/blob/master/nbgrader/utils.py#L157
 * @param cell
 */
export function computeGraderCellChecksum(cell: Cell) {
  const c = md5.create();
  const source = cell.textContent.split("\n");
  const numLines = source.length;
  for (let i = 0; i < numLines - 1; i++) {
    source[i] += "\n";
  }

  c.update(toBytes(/*source*/ cell.textContent));
  c.update(toBytes(/*source*/ cell.metadata.starboard_grader.original_cell_type));

  //TODO: unfinished.
}
