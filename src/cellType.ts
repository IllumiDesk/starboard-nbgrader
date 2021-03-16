import {Cell} from "starboard-notebook/dist/src/types"
import {CellElements, CellHandler, CellHandlerAttachParameters, ControlButton, Runtime} from "starboard-notebook/dist/src/runtime"

import {GraderCellType, GraderCellTypeDefinitions as DEFINITIONS} from "./definitions";

import {StarboardTextEditor} from "starboard-notebook/dist/src/components/textEditor";
import { ConsoleOutputElement } from "starboard-notebook/dist/src/components/output/consoleOutput";
import { NBGraderMetadata, StarboardGraderMetadata } from "./types";
import { graderMetadataToNBGraderCellType } from "./graderUtils";
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

const mdlib = runtime.exports.libraries.MarkdownIt;
const {hookMarkdownItToPrismHighlighter, hookMarkdownItToKaTeX} = runtime.exports.core;


const GRADER_CELL_TYPE_DEFINITION = {
    name: "Assignment (grader)",
    cellType: ["grader"],
    createHandler: (cell: Cell, runtime: Runtime) => new GraderCellHandler(cell, runtime),
}

const md = new mdlib({html: true});
hookMarkdownItToPrismHighlighter(md);
const katexHookPromise = hookMarkdownItToKaTeX(md);

export class GraderCellHandler implements CellHandler {
    cell: Cell;
    runtime: Runtime;

    elements!: CellElements;
    editor?: StarboardTextEditor;
    outputElement!: ConsoleOutputElement;

    private markdownOutputElement: HTMLDivElement;

    private graderType: GraderCellType = "manual-answer";
    private underlyingCellType: "python" | "markdown";

    /**
     * The editor is shown for Markdown content currently (instead of the content itself)
     */
    private isInEditMode: boolean = false;

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
                locked: false,
                schema_version: 3,
            }
            this.cell.metadata.nbgrader = md;
        }
        this.graderType = graderMetadataToNBGraderCellType(this.getNBGraderMetadata());
        this.markdownOutputElement = document.createElement("div");
        this.markdownOutputElement.classList.add("mt-3", "mb-2");

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
        let editOrRunButton: ControlButton;
        if (this.underlyingCellType === "python") return html``;

        if (this.isInEditMode) {
            editOrRunButton = {
                icon: icons.PlayCircleIcon,
                tooltip: "Render as HTML",
                callback: () => this.runtime.controls.emit({id: this.cell.id, type: "RUN_CELL"}),
            };
        } else {
            editOrRunButton = {
                icon: icons.TextEditIcon,
                tooltip: "Edit Markdown",
                callback: () => this.enterEditMode(),
            };
        }
        
        return cellControlsTemplate({ buttons: [editOrRunButton] });
    }

    private updateRender() {
        const topElement = this.elements.topElement;
        lithtml.render(this.topbarTemplate(), topElement);
        lithtml.render(this.getControls(), this.elements.topControlsElement);
    }

    private enterEditMode() {
        this.isInEditMode = true;
        this.markdownOutputElement.innerHTML = "";
        this.setupEditor();
        this.updateRender();
    }

    private setupEditor() {
        this.editor = new StarboardTextEditorConstructor(this.cell, this.runtime, {language: this.underlyingCellType});
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
            this.isInEditMode = true;
            this.markdownOutputElement.innerHTML = "";

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
            ${
                DEFINITIONS[this.graderType].supportedCellTypes.map(ct => html`
                    <button
                        @click=${() => this.changeLanguage(ct)} 
                        class="btn btn-sm btn-secondary ${this.underlyingCellType === ct ? "active":""}"
                    >
                    ${ct}
                    </button>
            `)}
            </div>

            <small>
            ${DEFINITIONS[this.graderType].description}
            </small>

            
            <hr>

            <div class="row">
                <div class="col-auto">
                ${DEFINITIONS[this.graderType].hasPoints ?
                    html`
                    <div class="input-group input-group-sm mb-3">
                        <span class="input-group-text">Point Value</span>
                        <input @input="${(e: any) => this.changePointValue(e)}" type="number" min="0" max="999999999999" placeholder="Points (number equal or greater than 0)" class="form-control" value="${md.points}">
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
        <style>
            .grader-cell {
                border: 1px solid #999;
                background-color: #fafafa;
                padding: 0.8em;
                border-radius: 6px;
            }
            .grader-cell-top-bar {
                border-bottom-left-radius: 0;
                border-bottom-right-radius: 0;
                border-bottom: 1px transparent solid;
            }

            .grader-cell-bottom-bar {
                border-top-left-radius: 0;
                border-top-right-radius: 0;
                border-top: 1px transparent solid;
                display: flex;
                justify-content: center;
                padding: 4px;
            }
        </style>
        <div class="grader-cell grader-cell-top-bar">
            ${body}
        </div>
        <div>
            ${this.editor}
        </div>
        ${this.markdownOutputElement}
        <!-- <div class="grader-cell grader-cell-bottom-bar"></div> -->
        `
    }

    attach(params: CellHandlerAttachParameters) {
        this.elements = params.elements;
        this.editor = new StarboardTextEditorConstructor(this.cell, this.runtime, {language: this.underlyingCellType});

        if (this.underlyingCellType === "markdown") {
            if (this.cell.textContent !== "") {
                this.run();
            } else { // When creating an empty cell, it makes more sense to start in editor mode
                this.enterEditMode();
            }
        }

        this.updateRender();
    }

    async run() {
        // TODO: evaluate Python if it's a Python cell.
        if (this.underlyingCellType === "markdown") {
            const topElement = this.elements.topElement;

            if (this.editor !== undefined) {
                this.editor.dispose();
                delete this.editor;
            }

            const outDiv = document.createElement("div");
            outDiv.classList.add("markdown-body");
            outDiv.innerHTML = md.render(this.cell.textContent);

            await katexHookPromise;

            outDiv.innerHTML = md.render(this.cell.textContent);
            this.markdownOutputElement.innerHTML = "";
            this.markdownOutputElement.appendChild(outDiv);
            this.markdownOutputElement.children[0].addEventListener("dblclick", (_event: any) => this.enterEditMode());
            this.isInEditMode = false;
            this.updateRender();
        } else {
            this.markdownOutputElement.innerHTML = "";
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