import { Cell } from "starboard-notebook/dist/src/types";
import { CellElements, CellHandler, CellHandlerAttachParameters, ControlButton, Runtime } from "starboard-notebook/dist/src/types";

import {
  convertNBGraderType,
  getDefaultCellNBGraderMetadata,
  GraderCellType,
  GraderCellTypeDefinitions as DEFINITIONS,
} from "./definitions";

import { LitHtml as lithtml } from "starboard-notebook/dist/src/runtime/esm/exports/libraries";
import { StarboardContentEditor, StarboardTextEditor } from "starboard-notebook/dist/src/runtime/esm/exports/elements";
import { cellControls as cellControlsTemplate, icons } from "starboard-notebook/dist/src/runtime/esm/exports/templates";

import { NBGraderMetadata, StarboardGraderMetadata } from "./types";
import { graderCellTypeLockableness, graderMetadataToNBGraderCellType } from "./graderUtils";
import { TemplateResult } from "lit";
import { CodeRunnerFeedbackElement, CodeRunnerResult } from "./elements/codeRunnerFeedback";
import { getJupyterPlugin } from "./jupyter";
import { getPythonExecutionMode } from "./state";

declare const runtime: Runtime;
declare const html: typeof lithtml.html;

type OutputArea = ReturnType<ReturnType<typeof getJupyterPlugin>["exports"]["createJupyterOutputArea"]>;

const GRADER_CELL_TYPE_DEFINITION = {
  name: "Assignment (grader)",
  cellType: ["grader"],
  createHandler: (cell: Cell, runtime: Runtime) => new GraderCellHandler(cell, runtime),
};

export class GraderCellHandler implements CellHandler {
  cell: Cell;
  runtime: Runtime;

  elements!: CellElements;
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
        callback: () => this.runtime.controls.emit({ id: this.cell.id, type: "RUN_CELL" }),
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
    lithtml.render(this.topTemplate(), topElement);
    lithtml.render(this.getControls(), this.elements.topControlsElement);
    lithtml.render(html`${this.codeRunnerFeedbackElement}`, this.elements.bottomElement);
  }

  private setupEditor() {
    if (this.editor !== undefined) {
      this.editor.dispose();
    }

    if (this.underlyingCellType === "python") {
      this.editor = new StarboardTextEditor(this.cell, this.runtime, { language: this.underlyingCellType });
    } else {
      this.editor = new StarboardContentEditor(this.cell, this.runtime);
    }
  }

  private changeNBType(newType: GraderCellType) {
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

  private toggleExpansion() {
    this.topbarExpanded = !this.topbarExpanded;
    this.updateRender();
  }

  private toggleStudentLock(event: InputEvent) {
    const md = this.getNBGraderMetadata();
    md.locked = (event.target! as HTMLInputElement).value === "on";
    this.updateRender();
  }

  topTemplate() {
    const md = this.getNBGraderMetadata();
    const graderDefinition = DEFINITIONS[this.graderType];
    let topbarControls: TemplateResult | undefined;

    const lockableness = graderCellTypeLockableness(this.graderType);

    if (this.topbarExpanded) {
      topbarControls = html` <div class="grader-cell grader-cell-top-bar ${this.graderType}">

        
        <div class="grader-controls">

          <!-- Markdown vs Python selector -->
          <div class="btn-group btn-sm ps-0" role="group" aria-label="Grader cell type">
            <button
              @click=${() => this.changeNBType("markdown")}
              class="btn btn-sm ${this.graderType} ${
        this.graderType === "markdown" || this.underlyingCellType === "markdown" ? "active" : ""
      }"
            >
              📃 Markdown
            </button>
            <button
              @click=${() => this.changeNBType("python")}
              class="btn btn-sm ${this.graderType} ${this.graderType === "python" || this.underlyingCellType === "python" ? "active" : ""}"
            >
              🐍 Python
            </button>
          </div>

           <!-- Grader type selector -->
            <div class="btn-group btn-sm ps-0" role="group" aria-label="Grader cell type">
              ${Object.entries(DEFINITIONS).map(([type, def]) => {
                // Markdown and python are rendered independently above.
                if (type === "markdown" || type === "python") return undefined;

                const isDisabled = def.supportedCellTypes.indexOf(this.underlyingCellType) === -1;

                let classes = "";
                if (this.graderType === type) classes += " active";
                const styles = `pointer-events: auto; ${isDisabled ? "cursor: not-allowed" : ""}`;

                let title = isDisabled ? `A ${this.graderType} cell can't be an ${def.name}` : "";

                return html`
                  <button
                    ?disabled=${isDisabled}
                    title="${title}"
                    style=${styles}
                    @click=${() => this.changeNBType(type as GraderCellType)}
                    class="btn btn-sm ${this.graderType} ${classes}"
                  >
                    ${def.emoji} ${def.name}
                  </button>
                `;
              })}
            </div>

            ${
              graderDefinition.hasPoints
                ? html`
                    ${graderDefinition.hasPoints
                      ? html` <div class="input-group input-group-sm mb-3" style="max-width: 132px">
                          <span class="input-group-text">Points</span>
                          <input
                            @input="${(e: any) => this.changePointValue(e)}"
                            type="number"
                            min="0"
                            max="999999999999"
                            placeholder="Points (number equal or greater than 0)"
                            class="form-control"
                            value="${md.points || 0}"
                          />
                        </div>`
                      : undefined}
                  `
                : undefined
            }

            ${(() => {
              if (lockableness === "never") {
                return undefined; // Display nothing when the cell is editable by students
              } else if (lockableness === "always") {
                return html`<label class="form-check-label ms-auto" title="This cell can not be edited by students">🔒</label>`;
              }

              return html`<div class="form-check form-switch ms-auto" title="Disable editing of this cell by students">
                <label class="form-check-label" for="lockEditing">🔒</label>
                <input
                  @change=${(evt: InputEvent) => this.toggleStudentLock(evt)}
                  class="form-check-input mx-1"
                  type="checkbox"
                  id="lockEditing"
                  ?disabled=${lockableness !== "choice"}
                  ?checked=${this.getNBGraderMetadata().locked}
                />
              </div>`;
            })()}

          </div>
          <p class="mb-0"><small>${graderDefinition.description}</small></p>
        </div>
      </div>`;
    }

    return html`
      <button @click=${() => this.toggleExpansion()} class="grader-pill ${this.graderType}${this.topbarExpanded ? " expanded" : ""}">
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
          lithtml.render(this.getControls(), this.elements.topControlsElement);
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
        lithtml.render(this.getControls(), this.elements.topControlsElement);

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
    lithtml.render(lithtml.html``, outputMount);
  }
}

export function registerGraderCellType() {
  runtime.definitions.cellTypes.register(GRADER_CELL_TYPE_DEFINITION.cellType, GRADER_CELL_TYPE_DEFINITION);
}
