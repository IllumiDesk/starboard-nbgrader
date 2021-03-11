import {Cell} from "starboard-notebook/dist/src/types"
import {CellElements, CellHandler, CellHandlerAttachParameters, Runtime} from "starboard-notebook/dist/src/runtime"
import {UserLockIcon} from "@spectrum-web-components/icons-workflow";

import {StarboardTextEditor} from "starboard-notebook/dist/src/components/textEditor";
import { ConsoleOutputElement } from "starboard-notebook/dist/src/components/output/consoleOutput";
import { NBGraderMetadata } from "./types";
import { TemplateResult } from "lit-html";

declare const runtime: Runtime

// In order not to bundle the same dependencies again, we take them from the exported values which are
// present on the global runtime variable.
// This also prevents version incompatibilities.

const lithtml = runtime.exports.libraries.LitHtml;
const html = lithtml.html;

const StarboardTextEditorConstructor = runtime.exports.elements.StarboardTextEditor;
const ConsoleOutputElementConstructor = runtime.exports.elements.ConsoleOutputElement;
const cellControlsTemplate = runtime.exports.templates.cellControls;
const icons = runtime.exports.templates.icons;

const GRADER_CELL_TYPE_DEFINITION = {
    name: "Assignment (grader)",
    cellType: ["grader"],
    createHandler: (cell: Cell, runtime: Runtime) => new GraderCellHandler(cell, runtime),
}

type NBGraderCellType = "manual-answer" | "manual-task" | "autograder-answer" | "autograder-tests";

const NBGraderCellTypeDescriptions: Record<NBGraderCellType, TemplateResult> = {
    "manual-answer": html`
        <p>
            In a <b>graded answer cell</b> the student enters their answer in a specific location in this cell.
            <br>This makes it a good choice for free-form answers. After submission these cells are to be graded manually.
     </p>`,
    "manual-task": html`
         <p>
             In a <b>graded task</b> the student adds their answer across the notebook.
             <br>Use this for free-form answers that span multiple cells, or for tasks that are global (e.g. "Make sure all Python code follows the PEP8 style guidelines"). After submission these cells are to be graded manually.
      </p>`,
    "autograder-answer": html`
    <p>
        TODO
    </p>`,
    "autograder-tests": html`
    <p>
        TODO
    </p>`
}


function graderMetadataToNBGraderCellType(m: NBGraderMetadata | undefined): NBGraderCellType {
    if (m === undefined) { // Default
        return "manual-answer";
    }
    if (m.points === undefined) {
        return "manual-answer";
    }

    if (m.grade && m.solution && !m.task) {
        return "manual-answer";
    } else if (!m.grade && !m.solution && m.task) {
        return "manual-task";
    } else if (!m.grade && m.solution && !m.task) {
        return "autograder-answer"
    } else if (m.grade && !m.solution && !m.task) {
        return "autograder-tests";
    }
    console.error("Possibly invalid nbgrader cell metadata:", m);
    return "manual-answer";
}


export class GraderCellHandler implements CellHandler {
    cell: Cell;
    runtime: Runtime;

    elements!: CellElements;
    editor?: StarboardTextEditor;
    outputElement!: ConsoleOutputElement;

    private nbgraderType: NBGraderCellType = "manual-answer";

    constructor(cell: Cell, runtime: Runtime) {
        this.cell = cell;
        this.runtime = runtime;

        if (this.getNBGraderMetadata() === undefined) {
            const md: NBGraderMetadata = {
                solution: true,
                grade: true,
                points: 1,
                task: false,
                grade_id: this.cell.id,
                locked: true,
                schema_version: 3,
            }
            this.cell.metadata.nbgrader = md;
        }
    }

    private getNBGraderMetadata() {
        return this.cell.metadata.nbgrader as NBGraderMetadata;
    }

    private changeNBType(newType: NBGraderCellType) {
        this.nbgraderType = newType;

        if (newType === "manual-answer") {
            
        }

        const topElement = this.elements.topElement;
        lithtml.render(this.topbarTemplate(), topElement);
    }

    topbarTemplate() {
        const meta = this.getNBGraderMetadata();
        

        let body = html`

            <button class="${this.nbgraderType === "manual-answer" ? "selected":""}" @click=${()=>this.changeNBType("manual-answer")}>Graded answer cell</button>
            <button class="${this.nbgraderType === "manual-task" ? "selected":""}" @click=${()=>this.changeNBType("manual-task")}>Graded task description</button>

            <button class="${this.nbgraderType === "autograder-answer" ? "selected":""}" @click=${()=>this.changeNBType("autograder-answer")}>Auto-graded answer</button>
            <button class="${this.nbgraderType === "autograder-tests" ? "selected":""}" @click=${()=>this.changeNBType("autograder-tests")}>Auto-graded tests</button>
            <small>
            ${NBGraderCellTypeDescriptions[this.nbgraderType]}
            </small>

            ${this.nbgraderType !== "autograder-answer" ?
                html`
                <small><label for="points">Point value</label></small>
                <br><input id="points" name="points" type="number" min="0" max="1000000" placeholder="Points (in numbers)" value="1">`
                : undefined
            }
            <br><small><label for="grader-id">Cell ID (optional, advanced)</label></small>
                <br><input id="grader-id" name="grader-id" type="text" min="1" max="128" placeholder="Alphanumerical unique ID" value="${this.getNBGraderMetadata()?.grade_id || this.cell.id}">
            `

        return html`
        <style>

            .grader-cell {
                border: 1px solid #3786cc;
                background-color: #ddecff;
                padding: 0.8em;
                border-radius: 6px;
            }


            .grader-cell-top-bar {
                border-bottom-left-radius: 0;
                border-bottom-right-radius: 0;
                border-bottom: 1px transparent solid;
            }

            .grader-cell button {
                background-color: white;
                color: black;
                border-radius: 6px;
                padding: 0.5em 1em;
                margin: 2px;
                font-size: 1em;
                
                border: 1px solid black;
                cursor: pointer;
            }

            .grader-cell button:hover {
                filter: brightness(0.925);
            }

            .grader-cell button.link-like {
                background: transparent;
                border: transparent;
            }

            .grader-cell button.selected {
                background-color: #4a8add;
                font-weight: 700;
                color: white;
            }

            .grader-cell-top-bar small {
                line-height: 1.25em;
            }

            .grader-cell-bottom-bar {
                border-top-left-radius: 0;
                border-top-right-radius: 0;
                border-top: 1px transparent solid;
                display: flex;
                justify-content: center;
            }



        </style>
        <div class="grader-cell grader-cell-top-bar">
            ${body}
        </div>
        <div>
            ${this.editor}
        </div>
        <div class="grader-cell grader-cell-bottom-bar">
        </div>
        `
    }

    attach(params: CellHandlerAttachParameters) {
        this.elements = params.elements;

        this.editor = new StarboardTextEditorConstructor(this.cell, this.runtime, {language: "python"}) as any;

        const topElement = this.elements.topElement;
        lithtml.render(this.topbarTemplate(), topElement);
    }

    async run() {
        // TODO: evaluate Python if it's a Python cell.
    }

    focusEditor() {
        this.editor?.focus();
    }

    async dispose() {
        this.editor?.remove();
    }
}

export function registerGraderCellType() {
    runtime.definitions.cellTypes.register(GRADER_CELL_TYPE_DEFINITION.cellType, GRADER_CELL_TYPE_DEFINITION);
}

export function registerStudentLockedCellProperty() {
    runtime.definitions.cellProperties.register("nbgrader_locked", {
        name: "Locked for students",
        textEnabled: "Locked for students: they won't be able to edit this cell.",
        textDisabled: "Lock cell for students (stop them from editing)",
        cellProperty: "nbgrader_locked",
        icon: () => "STUDENT LOCK",
    });
}
