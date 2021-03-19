import {Cell} from "starboard-notebook/dist/src/types"
import {CellElements, CellHandler, CellHandlerAttachParameters, ControlButton, Runtime} from "starboard-notebook/dist/src/runtime"

import {GraderCellType, GraderCellTypeDefinitions as DEFINITIONS} from "./definitions";

import {LitHtml as lithtml} from "starboard-notebook/dist/src/runtime/esm/exports/libraries";
import { StarboardContentEditor, StarboardTextEditor } from "starboard-notebook/dist/src/runtime/esm/exports/elements";
import { cellControls as cellControlsTemplate, icons } from "starboard-notebook/dist/src/runtime/esm/exports/templates";


import { NBGraderMetadata, StarboardGraderMetadata } from "./types";
import { graderMetadataToNBGraderCellType } from "./graderUtils";
import { TemplateResult } from "lit-html";

declare const runtime: Runtime
declare const html: typeof lithtml.html;

const GRADER_CELL_TYPE_DEFINITION = {
    name: "Assignment (grader)",
    cellType: ["grader"],
    createHandler: (cell: Cell, runtime: Runtime) => new GraderCellHandler(cell, runtime),
}

export class GraderCellHandler implements CellHandler {
    cell: Cell;
    runtime: Runtime;

    elements!: CellElements;
    editor?: InstanceType<typeof StarboardTextEditor> | InstanceType<typeof StarboardContentEditor>;

    private graderType: GraderCellType;
    private underlyingCellType: "python" | "markdown";

    /**
     * The editor is shown for Markdown content currently (instead of the content itself)
     */
    private isCurrentlyRunning: boolean = false;
    private isCurrentlyLoadingPyodide: boolean = false;

    /**
     * The last ID of a Python run. This is used for showing the right state of the "run" button if there are
     * more than 1 overlapping runs of Python in this cell.
     */
    private lastRunId = -1;

    constructor(cell: Cell, runtime: Runtime) {
        this.cell = cell;
        this.runtime = runtime;

        if (this.getNBGraderMetadata() === undefined) {
            this.cell.metadata.nbgrader = getDefaultCellNBGraderMetadata(this.cell.id);
        }
        this.graderType = graderMetadataToNBGraderCellType(this.getNBGraderMetadata());

        const starboardGraderMetadata = (this.cell.metadata.starboard_grader as StarboardGraderMetadata | undefined);
        if (!starboardGraderMetadata) {
            this.underlyingCellType = "python";
        } else {
            this.underlyingCellType = starboardGraderMetadata.original_cell_type;
        }
    }

    private getNBGraderMetadata() {
        return this.cell.metadata.nbgrader as NBGraderMetadata;
    }

    private getControls(): TemplateResult | string {
        if (this.underlyingCellType === "python") {
            const icon = this.isCurrentlyRunning ? icons.ClockIcon : icons.PlayCircleIcon;
            const tooltip = this.isCurrentlyRunning ? "Run Cell": "Cell is running";
            const runButton: ControlButton = {
                icon,
                tooltip,
                callback: () => this.runtime.controls.emit({id: this.cell.id, type: "RUN_CELL"}),
            };
            let buttons = [runButton];

            if (this.isCurrentlyLoadingPyodide) {
                buttons = [{
                    icon: icons.GearsIcon,
                    tooltip: "Downloading and initializing Pyodide",
                    callback: () => {alert("Loading Python runtime. It's fairly large so it may take some time. It will be cached for next time.")}
                }, ...buttons]
            }

            return cellControlsTemplate({ buttons });
        } else {
            return ''
        }
    }

    private updateRender() {
        const topElement = this.elements.topElement;
        lithtml.render(this.topbarTemplate(), topElement);
        lithtml.render(this.getControls(), this.elements.topControlsElement);
    }

    private setupEditor() {
        if (this.editor !== undefined) {
            this.editor.dispose();
        }

        if (this.underlyingCellType === "python") {
            this.editor = new StarboardTextEditor(this.cell, this.runtime, {language: this.underlyingCellType});
        } else {
            this.editor = new StarboardContentEditor(this.cell);
        }
    }

    private changeNBType(newType: GraderCellType) {
        this.graderType = newType;
        const md = this.getNBGraderMetadata();

        // TODO refactor this logic into a different file/routine
        if (newType === "manual-answer") {
            md.grade = md.solution = true;
            md.task = md.locked = false;
            md.points = md.points || 1;
        } else if (newType === "manual-task") {
            md.grade = md.solution = false;
            md.task = md.locked = true;
            md.points = md.points || 1;
        } else if (newType === "autograder-answer") {
            md.grade = md.task = md.locked = false;
            md.solution = true;
            delete md.points;
            this.changeLanguage("python");
        } else if (newType === "autograder-tests") {
            md.grade = md.locked = true;
            md.solution = md.task = false;
            md.points = md.points || 1;
            this.changeLanguage("python");
        }

        this.updateRender();
    }

    private changeLanguage(newLanguage: "python" | "markdown") {
        if (newLanguage !== this.underlyingCellType) {
            this.underlyingCellType = newLanguage;
            this.setupEditor();
            this.cell.metadata.starboard_grader = {original_cell_type: this.underlyingCellType};

            this.updateRender();
        }
    }

    private changeCellId(evt: Event) {
        const newValue = (evt.target as HTMLInputElement).value;
        if (typeof newValue === "string") {
            (this.cell.metadata.nbgrader as NBGraderMetadata).grade_id = newValue || this.cell.id;
        }
    }

    private changePointValue(evt: Event) {
        const newValue = (evt.target as HTMLInputElement).value;
        try {
            (this.cell.metadata.nbgrader as NBGraderMetadata).points = parseInt(newValue, 10)
        } catch(e) {
            (this.cell.metadata.nbgrader as NBGraderMetadata).points = 0;
        }
    }

    topbarTemplate() {
        const md = this.getNBGraderMetadata();
        
        let body = html`
            <div class="btn-group btn-sm" role="group" aria-label="Grader cell type">
                ${Object.entries(DEFINITIONS)
            .map(([type, def]) => 
                html`
                    <button
                        @click=${() => this.changeNBType(type as GraderCellType)} 
                        class="btn btn-sm btn-secondary ${this.graderType === type ? "active":""}"
                    >
                    ${def.name}
                    </button>
                `
            )}
            </div>

            <div class="btn-group btn-sm" role="group" style="float: right" aria-label="Cell language">
            ${DEFINITIONS[this.graderType].supportedCellTypes.map(ct => html`
                    <button
                        @click=${() => this.changeLanguage(ct)} 
                        class="btn btn-sm btn-secondary ${this.underlyingCellType === ct ? "active":""}"
                    >
                    ${ct}
                    </button>`)}
            </div>

            <small>${DEFINITIONS[this.graderType].description}</small>
            <hr>

            <div class="row">
                <div class="col-auto">
                ${DEFINITIONS[this.graderType].hasPoints ?
                    html`
                    <div class="input-group input-group-sm mb-3">
                        <span class="input-group-text">Point Value</span>
                        <input @input="${(e: any) => this.changePointValue(e)}" type="number" min="0" max="999999999999" placeholder="Points (number equal or greater than 0)" class="form-control" value="${md.points || 0}">
                    </div>`
                    : undefined
                }
                </div>
                <div class="col-auto">
                <div class="input-group input-group-sm mb-3">
                    <span class="input-group-text">Cell ID</span>
                    <input @input="${(e: any) => this.changeCellId(e)}" class="form-control" name="grader-id" type="text" min="1" max="128" placeholder="Unique alphanumerical ID" value="${md.grade_id || this.cell.id}">
                </div>
                </div>
            </div>
            `
        return html`
        <div class="grader-cell grader-cell-top-bar">
            ${body}
        </div>
        <div>${this.editor}</div>
        `
    }

    attach(params: CellHandlerAttachParameters) {
        this.elements = params.elements;

        this.setupEditor();
        this.updateRender();
    }

    async run() {
        // TODO: evaluate Python if it's a Python cell.
        if (this.underlyingCellType === "markdown") {
            this.updateRender();
        } else if (this.underlyingCellType === "python"){

            const pythonPlugin = await this.runtime.exports.libraries.async.StarboardPython();

            const codeToRun = this.cell.textContent;

            this.lastRunId++;
            const currentRunId = this.lastRunId;
            this.isCurrentlyRunning = true;

            if (pythonPlugin.getPyodideLoadingStatus() !== "ready") {
                this.isCurrentlyLoadingPyodide = true;
                lithtml.render(this.getControls(), this.elements.topControlsElement);
            }
            const val = await pythonPlugin.runStarboardPython(this.runtime, codeToRun, this.elements.bottomElement);
            this.isCurrentlyLoadingPyodide = false;
            if (this.lastRunId === currentRunId) {
                this.isCurrentlyRunning = false;
                lithtml.render(this.getControls(), this.elements.topControlsElement);
            }

            return val;
        }
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
function getDefaultCellNBGraderMetadata(id: string): any {
    throw new Error("Function not implemented.");
}

