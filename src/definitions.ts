
import { TemplateResult } from "lit-html";
import { Runtime } from "starboard-notebook/dist/src/runtime";

declare const runtime: Runtime

// In order not to bundle the same dependencies again, we take them from the exported values which are
// present on the global runtime variable.
// This also prevents version incompatibilities.

const lithtml = runtime.exports.libraries.LitHtml;
const html = lithtml.html;

export type GraderCellType = "manual-answer" | "manual-task" | "autograder-answer" | "autograder-tests";

export interface GraderCellTypeDefinition {
    /**
     * One paragraph description, used as inline help text.
     */
    description: TemplateResult,

    id: GraderCellType;

    /**
     * Name for human consumption, short, example usage is as button text.
     */
    name: string,

    supportedCellTypes: ("python" | "markdown")[],

    hasPoints: boolean,
}

export const GraderCellTypeDefinitions: Record<GraderCellType, GraderCellTypeDefinition> = {
    "manual-answer": {
        id: "manual-answer",
        name: "Graded answer cell",
        supportedCellTypes: ["markdown", "python"],
        hasPoints: true,
        description: html`
        <p>
            In a <b>graded answer cell</b> the student enters their answer in a specific location in this cell.
            <br>This makes it a good choice for free-form answers. After submission these cells are to be graded manually.
     </p>`
    },
    "manual-task": {
        id: "manual-task",
        name: "Graded task description",
        supportedCellTypes: ["markdown", "python"],
        hasPoints: true,
        description: html`
         <p>
             In a <b>graded task</b> the student adds their answer across the notebook.
             <br>Use this for free-form answers that span multiple cells, or for tasks that are global (e.g. "Make sure all Python code follows the PEP8 style guidelines"). After submission these cells are to be graded manually.
      </p>`},
    "autograder-answer": {
        id: "autograder-answer",
        name: "Auto-graded answer",
        supportedCellTypes: ["python"],
        hasPoints: false,
        description: html`
    <p>
        Description TODO
    </p>`
    },
    "autograder-tests": {
        id: "autograder-tests",
        name: "Auto-grader tests",
        supportedCellTypes: ["python"],
        hasPoints: true,
        description: html`
    <p>
        Description TODO
    </p>`
    }
}