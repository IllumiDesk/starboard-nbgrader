import { lit, litDecorators } from "starboard-notebook/dist/src/runtime/esm/exports/libraries";

export type CodeRunnerResult = "empty" | "success" | "test-success" | "test-fail" | "fail" | "running" | "running-setup" | "abort";

const html = lit.html;

/**
 * A custom element that is displayed above the cell output with some information about the output.
 *
 * For example, it shows a red bar with "Tests failed" in case of a auto-grader test cell that threw something.
 */
@litDecorators.customElement("grader-code-feedback")
export class CodeRunnerFeedbackElement extends lit.LitElement {
  showOutput: boolean = true;
  result: CodeRunnerResult = "empty";

  @litDecorators.query(".grader-code-cell-output")
  outputElement!: HTMLElement;

  constructor() {
    super();
  }

  createRenderRoot() {
    return this;
  }

  reset() {
    this.result = "empty";
    this.requestUpdate();
  }

  setRunResult(c: CodeRunnerResult) {
    this.result = c;
    this.requestUpdate();
  }

  /**
   * A HTML element where the output of the cell should be shown (such as a console output element).
   * @returns
   */
  getOutputElement() {
    return this.outputElement;
  }

  render() {
    return html` ${this.result === "empty"
        ? undefined
        : html` <div class="grader-code-feedback-bar ${this.result}">
            ${(() => {
              switch (this.result) {
                case "success": {
                  return html`<div>✅ Code ran succesfully</div>`;
                }
                case "fail": {
                  return html`<div>❌ An error was thrown</div>`;
                }
                case "test-success": {
                  return html`<div>✅ Tests passed</div>`;
                }
                case "test-fail": {
                  return html`<div>❌ Tests failed.</div>`;
                }
                case "running": {
                  return html`<div>⚙️ Cell is running..</div>`;
                }
                case "running-setup": {
                  return html`<div>⚙️ Cell is running.. (First time Python setup.. please wait)</div>`;
                }
                case "abort": {
                  return html`<div>❌ Cell aborted</div>`;
                }
              }
            })()}
          </div>`}
      <div class="grader-code-cell-output"></div>`;
  }
}
