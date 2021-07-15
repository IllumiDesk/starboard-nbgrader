import { Cell, CellTypeDefinition } from "starboard-notebook/dist/src/types";
import { CellElements, CellHandler, CellHandlerAttachParameters, ControlButton, Runtime } from "starboard-notebook/dist/src/types";

import {
  BasicGraderCellType,
  convertNBGraderType,
  getDefaultCellNBGraderMetadata,
  GraderCellType,
  GraderCellTypeDefinitions as DEFINITIONS,
  isBasicGraderType,
} from "../format/definitions";

import { lit } from "starboard-notebook/dist/src/runtime/esm/exports/libraries";
import { StarboardContentEditor, StarboardTextEditor } from "starboard-notebook/dist/src/runtime/esm/exports/elements";
import { cellControls as cellControlsTemplate, icons } from "starboard-notebook/dist/src/runtime/esm/exports/templates";

import { NBGraderMetadata, StarboardGraderMetadata } from "../format/types";
import { graderMetadataToNBGraderCellType } from "../format/graderUtils";
import { TemplateResult } from "lit";
import { CodeRunnerFeedbackElement, CodeRunnerResult } from "../elements/codeRunnerFeedback";
import { getJupyterPlugin } from "./jupyter";
import { getGraderPluginMode, getPythonExecutionMode } from "./state";
import { RemoveCellEvent, SetCellPropertyEvent } from "starboard-notebook/dist/src/types/events";
import { graderCellTopbarControlsTemplate } from "../elements/graderCellTopbar";

declare const runtime: Runtime;
declare const html: typeof lit.html;

type OutputArea = ReturnType<ReturnType<typeof getJupyterPlugin>["exports"]["createJupyterOutputArea"]>;

const GRADER_CELL_TYPE_DEFINITION: CellTypeDefinition = {
  name: "Assignment Cell",
  cellType: ["grader"],
  createHandler: (cell: Cell, runtime: Runtime) => new GraderCellHandler(cell, runtime),
};

export class GraderCellHandler implements CellHandler {
  cell: Cell;
  elements!: CellElements;
  runtime: Runtime;
  editor?: InstanceType<typeof StarboardTextEditor> | InstanceType<typeof StarboardContentEditor>;

  private topbarExpanded = false;
  /**
   * Quality of life feature: When switching away from a cell type that doesn't have points and back again, we remember
   * the last point count.
   */
  private cachedPointCount = 1;
  private get useJupyterBackend() {
    return getPythonExecutionMode() === "jupyter";
  }

  private jupyterOutputArea?: OutputArea;
  private graderType: GraderCellType;
  private underlyingCellType: "python" | "markdown";
  private isCurrentlyRunning: boolean = false;
  private isCurrentlyLoadingPyodide: boolean = false;
  /**
   * The last ID of a Python run. This is used for showing the right state of the "run" button if there are
   * more than 1 overlapping runs of Python in this cell.
   */
  private lastRunId = -1;
  private codeRunnerFeedbackElement: CodeRunnerFeedbackElement;

  constructor(cell: Cell, runtime: Runtime) {
    this.cell = cell;
    this.runtime = runtime;

    if (this.getNBGraderMetadata() === undefined) {
      this.cell.metadata.nbgrader = getDefaultCellNBGraderMetadata(this.cell.id);
    }

    const starboardGraderMetadata = this.cell.metadata.starboard_grader as StarboardGraderMetadata | undefined;
    if (starboardGraderMetadata?.is_basic_cell) {
      this.graderType = starboardGraderMetadata!.original_cell_type;
    } else {
      this.graderType = graderMetadataToNBGraderCellType(this.getNBGraderMetadata());
    }
    this.codeRunnerFeedbackElement = new CodeRunnerFeedbackElement();

    if (!starboardGraderMetadata) {
      this.underlyingCellType = "python";
    } else {
      this.underlyingCellType = starboardGraderMetadata.original_cell_type;
    }

    if (this.cell.metadata.editable === false && getGraderPluginMode() === "student") {
      this.runtime.controls.setCellProperty({ id: this.cell.id, property: "locked", value: true });
    }
  }

  private getNBGraderMetadata() {
    return this.cell.metadata.nbgrader as NBGraderMetadata;
  }

  private getControls(): TemplateResult | string | undefined {
    if (this.underlyingCellType === "python") {
      const icon = this.isCurrentlyRunning ? icons.ClockIcon : icons.PlayCircleIcon;
      const tooltip = this.isCurrentlyRunning ? "Run Cell" : "Cell is running";
      const runButton: ControlButton = {
        icon,
        tooltip,
        callback: () => this.runtime.controls.runCell({ id: this.cell.id }),
      };
      let buttons = [runButton];

      if (this.isCurrentlyLoadingPyodide) {
        buttons = [
          {
            icon: icons.GearsIcon,
            tooltip: "Downloading and initializing Pyodide",
            callback: () => {
              alert("Loading Python runtime. It's fairly large so it may take some time. It will be cached for next time.");
            },
          },
          ...buttons,
        ];
      }

      return cellControlsTemplate({ buttons });
    }
  }

  private updateRender() {
    const topElement = this.elements.topElement;
    lit.render(this.topTemplate(), topElement);
    lit.render(this.getControls(), this.elements.topControlsElement);
    lit.render(html`${this.codeRunnerFeedbackElement}`, this.elements.bottomElement);
  }

  private setupEditor() {
    if (this.editor !== undefined) {
      this.editor.dispose();
    }

    if (this.underlyingCellType === "python") {
      this.editor = new StarboardTextEditor(this.cell, this.runtime, { language: this.underlyingCellType });
    } else {
      this.editor = new StarboardContentEditor(this.cell, this.runtime, {
        editable: () => {
          return this.cell.metadata.editable;
        },
      });
    }
  }

  private clickGraderTypeButton(newType: GraderCellType) {
    const clickedOnBasicType = isBasicGraderType(newType);
    const currentTypeIsABasicType = isBasicGraderType(this.graderType);
    const isChangingType = newType !== this.graderType;

    if (!clickedOnBasicType && !currentTypeIsABasicType && !isChangingType) {
      // Toggle the clicked one off, reverting to the basic type
      newType = this.underlyingCellType;
    }

    if (clickedOnBasicType) {
      if (!currentTypeIsABasicType) {
        if (DEFINITIONS[this.graderType].supportedCellTypes.indexOf(newType as any) === -1) {
          // This underlying cell type is not supported, so we switch to the basic type
        } else {
          this.changeLanguage(newType as BasicGraderCellType);
          return;
        }
      }
    }

    this.graderType = newType;
    const md = this.getNBGraderMetadata();

    if (md.points !== undefined) {
      this.cachedPointCount = md.points;
    }

    convertNBGraderType(md, newType, this.cachedPointCount);
    // These types can't be markdown-based.
    if (newType === "autograder-answer" || newType === "autograder-tests" || newType === "python") {
      this.changeLanguage("python");
    } else if (newType === "markdown") {
      this.changeLanguage("markdown");
    }
    this.updateRender();
  }

  private changeLanguage(newLanguage: "python" | "markdown") {
    if (newLanguage !== this.underlyingCellType) {
      this.codeRunnerFeedbackElement = new CodeRunnerFeedbackElement();
      this.underlyingCellType = newLanguage;
      this.setupEditor();
      this.cell.metadata.starboard_grader = { original_cell_type: this.underlyingCellType };
      this.updateRender();
    }
  }

  private changePointValue(evt: Event) {
    const nbgraderMeta = this.cell.metadata.nbgrader as NBGraderMetadata;
    const newValue = (evt.target as HTMLInputElement).value;
    try {
      nbgraderMeta.points = parseInt(newValue, 10);
    } catch (e) {
      nbgraderMeta.points = 0;
    }
    if (isNaN(nbgraderMeta.points) || nbgraderMeta.points < 0) {
      nbgraderMeta.points = 0;
    }

    this.updateRender();
  }

  private onPillClick() {
    if (getGraderPluginMode() === "assignment-creator") {
      this.topbarExpanded = !this.topbarExpanded;
      this.updateRender();
    } else if (getGraderPluginMode() === "student") {
      // Students can only switch between python <> markdown for basic cells.
      if (isBasicGraderType(this.graderType)) {
        if (this.underlyingCellType === "markdown") {
          this.clickGraderTypeButton("python");
        } else {
          this.clickGraderTypeButton("markdown");
        }
      }
      this.updateRender();
    }
  }

  private toggleStudentLock(event: InputEvent) {
    const md = this.getNBGraderMetadata();
    md.locked = (event.target! as HTMLInputElement).value === "on";
    this.updateRender();
  }

  // Top half of the cell contains the pill and the editor
  topTemplate() {
    const md = this.getNBGraderMetadata();
    const graderDefinition = DEFINITIONS[this.graderType];
    const topbarControls = graderCellTopbarControlsTemplate({
      nbGraderMetadata: md,
      graderType: this.graderType,
      underlyingCellType: this.underlyingCellType,
      isExpanded: this.topbarExpanded,
      changePointValue: (evt) => this.changePointValue(evt),
      clickGraderTypeButton: (x) => this.clickGraderTypeButton(x),
      toggleStudentLock: (x) => this.toggleStudentLock(x),
    });

    return html`
      <button @click=${() => this.onPillClick()} class="grader-pill ${this.graderType}${this.topbarExpanded ? " expanded" : ""}">
        <b>${graderDefinition.emoji} ${graderDefinition.name}</b>
        ${graderDefinition.hasPoints
          ? html`<span class="ms-1"><small>(${md.points} point${md.points === 1 ? "" : "s"})</small></span>`
          : undefined}
      </button>
      ${topbarControls}
      <div>${this.editor}</div>
    `;
  }

  attach(params: CellHandlerAttachParameters) {
    this.elements = params.elements;
    this.setupEditor();
    this.updateRender();

    // Disallow students from removing locked cells or removing the lock
    if (getGraderPluginMode() === "student") {
      this.elements.cell.addEventListener("sb:set_cell_property", (evt: SetCellPropertyEvent) => {
        if (evt.detail.property === "locked") {
          if (evt.detail.value) {
            alert("You are not allowed to lock cells as a student.");
          } else {
            alert("You can not remove the edit restrictions of this cell.");
          }

          evt.preventDefault();
        }
      });

      this.elements.cell.addEventListener("sb:remove_cell", (evt: RemoveCellEvent) => {
        if (this.cell.metadata.properties.locked) {
          alert("Locked cells can not be removed.");
          evt.preventDefault();
        }
      });
    }
  }

  async run() {
    // TODO refactor this.. bigtime
    if (this.underlyingCellType === "markdown") {
      this.updateRender();
    } else if (this.underlyingCellType === "python") {
      const outputMount = this.codeRunnerFeedbackElement.getOutputElement();
      this.codeRunnerFeedbackElement.reset();

      // Pyodide-based plugin
      let pythonPlugin;
      // Jupyter-based plugin
      let jupyterPlugin = getJupyterPlugin();

      if (!this.useJupyterBackend) {
        pythonPlugin = await this.runtime.exports.libraries.async.StarboardPython();
        if (pythonPlugin.getPyodideLoadingStatus() !== "ready") {
          this.isCurrentlyLoadingPyodide = true;
          this.codeRunnerFeedbackElement.setRunResult("running-setup");
          lit.render(this.getControls(), this.elements.topControlsElement);
        } else {
          this.codeRunnerFeedbackElement.setRunResult("running");
        }
      } else {
        if (!this.jupyterOutputArea) {
          this.jupyterOutputArea = jupyterPlugin.exports.createJupyterOutputArea();
        }
        this.codeRunnerFeedbackElement.setRunResult("running");

        if (outputMount.children[0] !== this.jupyterOutputArea!.node) {
          outputMount.innerHTML = "";
          outputMount.append(this.jupyterOutputArea!.node);
        }
      }
      const codeToRun = this.cell.textContent;

      this.lastRunId++;
      const currentRunId = this.lastRunId;
      this.isCurrentlyRunning = true;
      let status: "ok" | "abort" | "error" = "ok";

      // Cell output value
      let val = undefined;
      let err = undefined;

      if (this.useJupyterBackend) {
        await jupyterPlugin.exports.getGlobalKernelManager().runCode({ code: codeToRun }, this.jupyterOutputArea!);
        const x = await this.jupyterOutputArea!.future.done;
        status = x.content.status;
        val = x.content;
      } else {
        try {
          val = await pythonPlugin.runStarboardPython(this.runtime, codeToRun, outputMount);
        } catch (e) {
          status = "error";
          err = e;
        }
      }

      this.isCurrentlyLoadingPyodide = false;
      if (this.lastRunId === currentRunId) {
        this.isCurrentlyRunning = false;
        lit.render(this.getControls(), this.elements.topControlsElement);

        let runnerStatusCode: CodeRunnerResult = status !== "ok" ? "fail" : "success";
        if (this.graderType === "autograder-tests") {
          runnerStatusCode = status !== "ok" ? "test-fail" : "test-success";
        }
        if (status === "abort") {
          runnerStatusCode = "abort";
        }
        this.codeRunnerFeedbackElement.setRunResult(runnerStatusCode);
      }

      if (err !== undefined) throw err;

      return val;
    }
  }

  focusEditor() {
    this.editor?.focus();
  }

  async dispose() {
    this.editor?.remove();
  }

  clear() {
    const outputMount = this.codeRunnerFeedbackElement.getOutputElement();
    this.codeRunnerFeedbackElement.reset();
    lit.render(lit.html``, outputMount);
  }
}

export function registerGraderCellType() {
  const def = GRADER_CELL_TYPE_DEFINITION;

  if (getGraderPluginMode() === "student") {
    def.createCellCreationInterface = (runtime: Runtime, opts: { create: () => void }) => {
      let cellInit: Partial<Cell> = {
        metadata: {
          properties: {},
          starboard_grader: {
            original_cell_type: "markdown",
            is_basic_cell: true,
          },
        },
      };

      function createCell(type: "markdown" | "python") {
        cellInit.metadata!.starboard_grader.original_cell_type = type;
        opts.create();
      }

      return {
        getCellInit: () => cellInit,
        render: () => lit.html`
          <div class="p-3">
            <button class="btn btn-secondary btn-small me-2" @click="${() => createCell("python")}">🐍 Python Cell</button>
            <button class="btn btn-secondary btn-small" @click="${() => createCell("markdown")}">📃 Markdown Cell</button>
          </div>
        `,
      };
    };
  }

  runtime.definitions.cellTypes.register(GRADER_CELL_TYPE_DEFINITION.cellType, GRADER_CELL_TYPE_DEFINITION);
}
