
import { TemplateResult } from "lit-html";
import { Runtime } from "starboard-notebook/dist/src/runtime";
import { LitHtml } from "starboard-notebook/dist/src/runtime/esm/exports/libraries";
import { NBGraderMetadata } from "./types";


declare const runtime: Runtime
declare const html: typeof LitHtml.html;

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

    /**
     * Does this type of cell have points associated with it when grading?
     */
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

export function getDefaultCellNBGraderMetadata(cellId: string): NBGraderMetadata {
    const md: NBGraderMetadata = {
        solution: true,
        grade: true,
        points: 1,
        task: false,
        grade_id: cellId,
        locked: false,
        schema_version: 3,
    }
    return md;
}