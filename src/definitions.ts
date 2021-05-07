import { TemplateResult } from "lit-html";
import { Runtime } from "starboard-notebook/dist/src/types";
import { LitHtml } from "starboard-notebook/dist/src/runtime/esm/exports/libraries";
import { NBGraderMetadata } from "./types";

declare const runtime: Runtime;
declare const html: typeof LitHtml.html;

export type GraderCellType = "manual-answer" | "manual-task" | "autograder-answer" | "autograder-tests";

export interface GraderCellTypeDefinition {
  /**
   * One paragraph description, used as inline help text.
   */
  description: TemplateResult;

  id: GraderCellType;

  /**
   * Name for human consumption, short, example usage is as button text.
   */
  name: string;

  emoji: string;

  supportedCellTypes: ("python" | "markdown")[];

  /**
   * Does this type of cell have points associated with it when grading?
   */
  hasPoints: boolean;
}

export const GraderCellTypeDefinitions: Record<GraderCellType, GraderCellTypeDefinition> = {
  "manual-answer": {
    id: "manual-answer",
    name: "Graded answer cell",
    supportedCellTypes: ["markdown", "python"],
    hasPoints: true,
    emoji: "✏️",
    description: html` <p>
      In a <b>graded answer cell</b> the student enters their answer in a specific location in this cell. <br />This
      makes it a good choice for free-form answers. After submission these cells are graded manually.
    </p>`,
  },
  "manual-task": {
    id: "manual-task",
    name: "Graded task",
    supportedCellTypes: ["markdown", "python"],
    hasPoints: true,
    emoji: "📝",
    description: html` <p>
      In a <b>graded task</b> the student adds their answer across the notebook. <br />Use this for free-form answers
      that span multiple cells, or for tasks that are global (e.g. "Make sure all Python code follows the PEP8 style
      guidelines"). After submission these cells graded manually.
    </p>`,
  },
  "autograder-answer": {
    id: "autograder-answer",
    name: "Auto-graded task",
    supportedCellTypes: ["python"],
    hasPoints: false,
    emoji: "🧪",
    description: html` <p>
        An <b>Auto-graded task</b> is a code assignment that is graded automatically. Points are earned in separate
        <b>Auto-grader test</b> cells.
      </p>
      <details>
        <summary>View Example</summary>
        <p>
          The student's answer is delimited by special <code>BEGIN SOLUTION</code> and
          <code>END SOLUTION</code> comments, anything in this section will not be visible to the student.
        </p>
        <pre><code>def squares(n):
    <b>"""Compute the squares of numbers from 1 to n"""</b>
    <b>### BEGIN SOLUTION</b>
    if n < 1:
        raise ValueError("n must be greater than or equal to 1")
    return [i**2 for i in range(1, n+1)]
    <b>### END SOLUTION</b></code></pre>
      </details>`,
  },
  "autograder-tests": {
    id: "autograder-tests",
    name: "Auto-grader test",
    supportedCellTypes: ["python"],
    hasPoints: true,
    emoji: "🤖",
    description: html`
      <p>
        An <b>Auto-grader test</b> cell is used to score code assignments automatically. Points are only scored if all
        tests in the cell pass.
      </p>
      <details>
        <summary>View Example</summary>
        <p>Test conditions can be hidden from the student using special <code>BEGIN HIDDEN TESTS</code> comments.</p>
        <pre><code>import nose
from nose.tools import assert_equal

assert_equal(squares(1), [1])
assert_equal(squares(2), [1, 4])

<b>### BEGIN HIDDEN TESTS</b>
assert_equal(squares(3), [1, 4, 9])
<b>### END HIDDEN TESTS</b>
</code></pre>
      </details>
    `,
  },
};

export function getDefaultCellNBGraderMetadata(cellId: string): NBGraderMetadata {
  const md: NBGraderMetadata = {
    solution: true,
    grade: true,
    points: 1,
    task: false,
    grade_id: cellId,
    locked: false,
    schema_version: 3,
  };
  return md;
}

/**
 * Mutates the given NBGraderMetadata such that it is valid for the new grader cell type.
 */
export function convertNBGraderType(md: NBGraderMetadata, newType: GraderCellType, pointCount: number) {
  if (newType === "manual-answer") {
    md.grade = md.solution = true;
    md.task = md.locked = false;
    md.points = md.points || pointCount;
  } else if (newType === "manual-task") {
    md.grade = md.solution = false;
    md.task = md.locked = true;
    md.points = md.points || pointCount;
  } else if (newType === "autograder-answer") {
    md.grade = md.task = md.locked = false;
    md.solution = true;
    delete md.points;
  } else if (newType === "autograder-tests") {
    md.grade = md.locked = true;
    md.solution = md.task = false;
    md.points = md.points || pointCount;
  }
}
