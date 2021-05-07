import { TemplateResult } from "lit-element";
import { Runtime } from "starboard-notebook/dist/src/types";
import { registerJupyterPlugin } from "../jupyter";
import { GraderPluginOpts } from "../plugin";

const LitElement = (window.runtime as Runtime).exports.libraries.LitElement;
const html = LitElement.html;

const runtimeDescriptions = {
  jupyter: "Jupyter",
  pyodide: "Pyodide (in-browser Python)",
};

@LitElement.customElement("starboard-grader-bar")
export class StarboardGraderBar extends LitElement.LitElement {
  private executionMode: "jupyter" | "pyodide" = "pyodide";
  private opts: GraderPluginOpts;
  private jupyterPluginStatus: "unstarted" | "loading" | "error-during-loading" | "loaded" = "unstarted";
  private runtime: Runtime;

  constructor(opts: GraderPluginOpts, runtime: Runtime) {
    super();
    this.opts = opts;
    this.runtime = runtime;

    if (this.opts.jupyter.serverSettings === undefined) {
      this.opts.jupyter.serverSettings = { baseUrl: "http://localhost:8888", token: "" };
    }
  }

  createRenderRoot() {
    return this;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  async enableJupyter(event: Event) {
    event.preventDefault();
    this.opts.jupyter.serverSettings!.baseUrl = (this.querySelector(
      'input[name="jupyter-server-url"]'
    ) as HTMLInputElement).value;
    this.opts.jupyter.mount = (this.querySelector(".jupyter-plugin-mount") as HTMLElement) || undefined;
    this.jupyterPluginStatus = "loading";
    this.performUpdate();
    try {
      await registerJupyterPlugin(this.opts.jupyter, this.opts.jupyterPluginUrl);
    } catch (e) {
      this.jupyterPluginStatus = "error-during-loading";
      this.performUpdate();
      throw e;
    }
    this.jupyterPluginStatus = "loaded";
    this.performUpdate();
  }

  switchExecutionMode() {
    this.executionMode = this.executionMode === "jupyter" ? "jupyter" : "pyodide";
    this.performUpdate();
  }

  private async runAllCells() {
    try {
      this.runtime.controls.runAllCells({});
    } catch (e) {
      console.error("ERR CAUGHT", e);
      throw e;
    }
  }

  render() {
    let content: TemplateResult;
    if (this.jupyterPluginStatus === "unstarted") {
      content = html` <form @submit=${(e: Event) => this.enableJupyter(e)}>
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
      content = html`<div class="alert bg-light text-dark" style="width: max-content">⌛ Jupyter Plugin loading</div>`;
    } else if (this.jupyterPluginStatus === "error-during-loading") {
      content = html`<div class="alert alert-error" style="width: max-content">
        ❌ Something went wrong loading the plugin, please check your browser's console for details.
      </div>`;
    } else {
      // content = html`<div>
      //     ${this.executionMode === "pyodide"
      //     ? html`<button class="btn btn-secondary btn-small" @click=${() => this.switchExecutionMode()}>Switch to Jupyter for running cells.</button>`
      //     : html`<button class="btn btn-secondary btn-small" @click=${() => this.switchExecutionMode()}>Switch to in-browser Python.</button>`
      //     }
      // </div>`
      content = html``;
    }
    return html`
      <section class="starboard-grader-interface py-2 px-3 my-2">
        <details>
          <summary class="d-flex justify-content-between flex-wrap">
            <div class="d-flex align-items-center flex-wrap">
              <h2 class="h5 mb-0 me-2">Notebook Assignment Creator</h2>
              <small class="x-small">Click to expand</small>
            </div>
            <div>
              <span class="badge ${this.executionMode === "jupyter" ? "bg-success" : "bg-primary"}">
                ${runtimeDescriptions[this.executionMode]}
              </span>
            </div>
          </summary>

          <div class="d-flex mt-2">
            <div class="row">
              <button @click=${() => this.runAllCells()} class="btn btn-primary btn-sm">Run all cells</button>
            </div>
            ${content}
          </div>
          <div class="jupyter-plugin-mount"></div>
        </details>
      </section>
    `;
  }
}
