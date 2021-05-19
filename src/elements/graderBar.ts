import { Runtime } from "starboard-notebook/dist/src/types";
import { registerJupyterPlugin } from "../jupyter";
import { GraderPluginOpts } from "../plugin";
import { getPythonExecutionMode, PythonGraderCellExecutionMode, setPythonExecutionMode } from "../state";

import { TemplateResult } from "lit";
import { customElement } from "lit/decorators.js";

const lit = (window.runtime as Runtime).exports.libraries.lit;
const html = lit.html;

type JupyterPluginLoadStatus = "unstarted" | "loading" | "error-during-loading" | "loaded";
type RunningAllCellsStatus = "unstarted" | "running" | "success" | "fail";

@customElement("starboard-grader-bar")
export class StarboardGraderBar extends lit.LitElement {
  set executionMode(val: PythonGraderCellExecutionMode) {
    setPythonExecutionMode(val);
  }
  get executionMode() {
    return getPythonExecutionMode();
  }

  private opts: GraderPluginOpts;
  private jupyterPluginStatus: JupyterPluginLoadStatus = "unstarted";
  private runningAllCellsStatus: RunningAllCellsStatus = "unstarted";
  private runtime: Runtime;

  constructor(opts: GraderPluginOpts, runtime: Runtime) {
    super();
    this.opts = opts;
    this.runtime = runtime;

    if (this.opts.jupyter.serverSettings === undefined) {
      this.opts.jupyter.serverSettings = {
        baseUrl: "http://localhost:8888",
        token: "",
      };
    }
  }

  createRenderRoot() {
    return this;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  private setRunningAllCellsStatus(status: RunningAllCellsStatus) {
    this.runningAllCellsStatus = status;
    this.requestUpdate();
  }

  async enableJupyter(event: Event) {
    event.preventDefault();
    this.opts.jupyter.serverSettings!.baseUrl = (this.querySelector(
      'input[name="jupyter-server-url"]'
    ) as HTMLInputElement).value;
    this.opts.jupyter.mount = (this.querySelector(".jupyter-plugin-mount") as HTMLElement) || undefined;
    this.jupyterPluginStatus = "loading";
    this.requestUpdate();
    try {
      await registerJupyterPlugin(this.opts.jupyter, this.opts.jupyterPluginUrl);
    } catch (e) {
      this.jupyterPluginStatus = "error-during-loading";
      this.requestUpdate();
      throw e;
    }
    this.jupyterPluginStatus = "loaded";
    this.requestUpdate();
  }

  switchExecutionMode() {
    this.executionMode = this.executionMode === "jupyter" ? "pyodide" : "jupyter";
    this.clearAllCells();
  }

  private async runAllCells() {
    this.clearAllCells();

    this.setRunningAllCellsStatus("running");
    try {
      await this.runtime.controls.runAllCells({});
      this.setRunningAllCellsStatus("success");
    } catch (e) {
      this.setRunningAllCellsStatus("fail");
      throw e;
    }
  }

  private clearAllCells() {
    try {
      this.setRunningAllCellsStatus("unstarted");
      this.runtime.controls.clearAllCells();
    } catch (e) {
      console.error("Failed to clear all cells:", e);
    }
  }

  render() {
    let content: TemplateResult;
    if (this.jupyterPluginStatus === "unstarted") {
      content = html` <form class="w-100" @submit=${(e: Event) => this.enableJupyter(e)}>
        <div class="form-text">
          You can connect to a running Jupyter kernel to run Python assignment cells on a remote machine.
        </div>
        <div class="input-group flex-nowrap">
          <input
            name="jupyter-server-url"
            type="text"
            class="form-control"
            placeholder="Jupyter server URL"
            value="http://localhost:8888"
            aria-label="Jupyter server URL"
          />
          <button type="submit" class="btn btn-outline-secondary">Connect to Jupyter</button>
        </div>
      </form>`;
    } else if (this.jupyterPluginStatus === "loading") {
      content = html`<div class="alert alert-info py-1 mt-2" style="width: max-content">
        ⌛ Jupyter Plugin loading..
      </div>`;
    } else if (this.jupyterPluginStatus === "error-during-loading") {
      content = html`<div class="alert alert-danger py-1 mt-2" style="width: max-content">
        ❌ Something went wrong loading the plugin, please check your browser's console for details.<br />
        Refresh the page to try again.
      </div>`;
    } else {
      content = html`<div></div>`;
    }

    let runAllIndicator = undefined;

    if (this.runningAllCellsStatus === "fail") {
      runAllIndicator = html`<span class="badge bg-danger">❌ Cell error</span>`;
    } else if (this.runningAllCellsStatus === "success") {
      runAllIndicator = html`<span class="badge bg-success"
        ><span class="bi bi-check-circle me-2"></span>Ran all cells without errors</span
      >`;
    } else if (this.runningAllCellsStatus === "running") {
      runAllIndicator = html`<span class="badge bg-light text-dark">⚙️ Running all cells..</span>`;
    }

    return html`
      <section class="starboard-grader-interface py-2 px-3 my-2">
        <details>
          <summary class="d-flex justify-content-between flex-wrap">
            <div class="d-flex align-items-center flex-wrap">
              <h2 class="h5 mb-0 me-2">Notebook Assignment Creator</h2>
              <small class="x-small">Click to expand</small>
            </div>
            <div class="d-flex">
              <div>
                ${this.jupyterPluginStatus !== "loaded"
                  ? undefined
                  : this.executionMode === "pyodide"
                  ? html`<button
                      class="btn btn-outline-primary btn-sm py-0 me-2"
                      @click=${() => this.switchExecutionMode()}
                    >
                      Switch to Jupyter
                    </button>`
                  : html`<button
                      class="btn btn-outline-primary btn-sm py-0 me-2"
                      @click=${() => this.switchExecutionMode()}
                    >
                      Switch to in-browser Python
                    </button>`}
              </div>
              <div>
                <span
                  class="badge ${this.executionMode === "jupyter" ? "bg-dark" : "bg-secondary"}"
                  title="${this.executionMode === "jupyter"
                    ? "Python cells will be run on a remote Jupyter machine"
                    : "Python cells will be run in your browser"}"
                >
                  ${this.executionMode === "jupyter"
                    ? html`<span class="bi bi-cloud me-1"></span> Jupyter`
                    : html` Pyodide`}
                </span>
              </div>
            </div>
          </summary>

          <div class="d-flex flex-column mt-2">
            <div class="d-flex">
              <button @click=${() => this.runAllCells()} class="btn btn-secondary btn-sm me-2">Run all cells</button>
              <button @click=${() => this.clearAllCells()} class="btn btn-secondary btn-sm me-2">
                Clear all output
              </button>
              <div>${runAllIndicator}</div>
            </div>
            <div class="d-flex mt-2 justify-content-center align-items-center">${content}</div>
          </div>
          <div class="jupyter-plugin-mount"></div>
        </details>
      </section>
    `;
  }
}
