import {Cell} from "starboard-notebook/dist/src/types"
import {CellElements, CellHandler, CellHandlerAttachParameters, Runtime} from "starboard-notebook/dist/src/runtime"

import {StarboardTextEditor} from "starboard-notebook/dist/src/components/textEditor";
import { ConsoleOutputElement } from "starboard-notebook/dist/src/components/output/consoleOutput";

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

export class GraderCellHandler implements CellHandler {
    cell: Cell;
    runtime: Runtime;

    elements!: CellElements;
    editor!: StarboardTextEditor;
    outputElement!: ConsoleOutputElement;

    constructor(cell: Cell, runtime: Runtime) {
        this.cell = cell;
        this.runtime = runtime;
    }

    getControls() {
        const runButton = {
            icon: icons.PlayCircleIcon,
            tooltip: "Run Cell",
            callback: () => this.runtime.controls.emit({id: this.cell.id, type: "RUN_CELL"}),
        };
        return cellControlsTemplate({ buttons: [runButton] });
    }

    attach(params: CellHandlerAttachParameters) {
        this.elements = params.elements;

        const topElement = this.elements.topElement;
        lithtml.render(this.getControls(), this.elements.topControlsElement);

        this.editor = new StarboardTextEditorConstructor(this.cell, this.runtime, {language: "python"}) as any;
        topElement.appendChild(this.editor);
    }

    async run() {
        const codeToRun = this.cell.textContent;
        this.outputElement = new ConsoleOutputElementConstructor();
        
        lithtml.render(html`${this.outputElement}`, this.elements.bottomElement);

        try {
            const val = eval(codeToRun);
            window.$_ = val;

            if (val !== undefined) {
                this.outputElement.addEntry({
                    method: "result",
                    data: [val]
                });
            }
            return val
        } catch(e) {
            this.outputElement.addEntry({
                method: "error",
                data: [e]
            });
        }

        return undefined;
    }

    focusEditor() {
        this.editor.focus();
    }

    async dispose() {
        this.editor.remove();
    }
}

export function registerGraderCellType() {
    runtime.definitions.cellTypes.register(GRADER_CELL_TYPE_DEFINITION.cellType, GRADER_CELL_TYPE_DEFINITION);
}