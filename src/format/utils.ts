import { Cell } from "starboard-notebook/dist/src/types";

const te = new TextEncoder();

// Mirrors https://github.com/jupyter/nbgrader/blob/master/nbgrader/utils.py#L152
export function toBytes(val: string): Uint8Array {
  return te.encode(val);
}

export function isTask(cell: Cell): boolean {
  if (cell.metadata.nbrader === undefined) {
    return false;
  }
  return !!cell.metadata.nbgrader.task;
}

// Mirrors https://github.com/jupyter/nbgrader/blob/master/nbgrader/utils.py#L46
export function isGrade(cell: Cell): boolean {
  if (cell.metadata.nbgrader === undefined) {
    return false;
  }
  return !!cell.metadata.nbgrader.grade;
}

// Mirrors https://github.com/jupyter/nbgrader/blob/master/nbgrader/utils.py#L46
export function isSolution(cell: Cell): boolean {
  if (cell.metadata.nbgrader === undefined) {
    return false;
  }

  return !!cell.metadata.nbgrader.solution;
}

// Mirrors https://github.com/jupyter/nbgrader/blob/master/nbgrader/utils.py#L53
export function isLocked(cell: Cell): boolean {
  if (cell.metadata.nbgrader === undefined) {
    return false;
  } else if (isSolution(cell)) {
    return false;
  } else if (isGrade(cell)) {
    return true;
  }

  return !!cell.metadata.nbgrader.locked;
}

export function pyFloatStr(num: number): string {
  // No such thing as an integer in Javascript. For some reason nbgrader converts
  // the grades to float before stringifying, so we need to convert "3" to "3.0".
  const s = num.toString();
  if (s.indexOf(".") == -1) {
    // no decimal
    return num.toFixed(1);
  }
  return s;
}

export function pyBoolStr(bool: boolean): "True" | "False" {
  return bool ? "True" : "False";
}
