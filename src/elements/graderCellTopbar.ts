import { Runtime } from "starboard-notebook/dist/src/types";
import { GraderCellType, GraderCellTypeDefinitions } from "../format/definitions";
import { graderCellTypeLockableness } from "../format/graderUtils";
import { NBGraderMetadata } from "../format/types";
import { TemplateResult } from "lit";

const lit = (window.runtime as Runtime).exports.libraries.lit;
const html = lit.html;

export interface GraderCellTopbarTemplateData {
  nbGraderMetadata: NBGraderMetadata;
  graderType: GraderCellType;
  isExpanded: boolean;
  underlyingCellType: "markdown" | "python";
  clickGraderTypeButton(ct: GraderCellType): void;
  changePointValue(evnt: Event): void;
  toggleStudentLock(event: InputEvent): void;
}

// TODO I think this should be a custom webcomponent instead of a template function
export function graderCellTopbarControlsTemplate(data: GraderCellTopbarTemplateData) {
  const md = data.nbGraderMetadata;
  const graderDefinition = GraderCellTypeDefinitions[data.graderType];
  const graderType = data.graderType;

  const lockableness = graderCellTypeLockableness(graderType);

  let topbarControls: TemplateResult | undefined = undefined;
  if (data.isExpanded) {
    topbarControls = html`<div class="grader-cell grader-cell-top-bar ${graderType}">
            <div class="grader-controls">
            <!-- Markdown vs Python selector -->
            <div class="btn-group btn-sm ps-0" role="group" aria-label="Grader cell type">
                <button
                @click=${() => data.clickGraderTypeButton("markdown")}
                class="btn btn-sm ${graderType} ${graderType === "markdown" || data.underlyingCellType === "markdown" ? "active" : ""}"
                >
                📃 Markdown
                </button>
                <button
                @click=${() => data.clickGraderTypeButton("python")}
                class="btn btn-sm ${graderType} ${graderType === "python" || data.underlyingCellType === "python" ? "active" : ""}"
                >
                🐍 Python
                </button>
            </div>

            <!-- Grader type selector -->
                <div class="btn-group btn-sm ps-0" role="group" aria-label="Grader cell type">
                ${Object.entries(GraderCellTypeDefinitions).map(([type, def]) => {
                  // Markdown and python are rendered independently above.
                  if (type === "markdown" || type === "python") return undefined;

                  const isDisabled = def.supportedCellTypes.indexOf(data.underlyingCellType) === -1;

                  let classes = "";
                  if (graderType === type) classes += " active";
                  const styles = `pointer-events: auto; ${isDisabled ? "cursor: not-allowed" : ""}`;

                  let title = isDisabled ? `A ${graderType} cell can't be an ${def.name}` : "";

                  return html`
                    <button
                      ?disabled=${isDisabled}
                      title="${title}"
                      style=${styles}
                      @click=${() => data.clickGraderTypeButton(type as GraderCellType)}
                      class="btn btn-sm ${graderType} ${classes}"
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
                                @input="${(e: any) => data.changePointValue(e)}"
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
                      @change=${(evt: InputEvent) => data.toggleStudentLock(evt)}
                      class="form-check-input mx-1"
                      type="checkbox"
                      id="lockEditing"
                      ?disabled=${lockableness !== "choice"}
                      ?checked=${md.locked}
                    />
                  </div>`;
                })()}

            </div>
            <p class="mb-0"><small>${graderDefinition.description}</small></p>
            </div>
        </div>`;
  }

  return topbarControls;
}
