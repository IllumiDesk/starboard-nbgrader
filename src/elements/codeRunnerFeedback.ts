import {LitElement, LitHtml} from "starboard-notebook/dist/src/runtime/esm/exports/libraries";

export type CodeRunnerResult = "empty" | "success" | "fail";

const html = LitHtml.html;

@LitElement.customElement("grader-code-feedback")
export class CodeRunnerFeedbackElement extends LitElement.LitElement {
    showOutput: boolean = true;

    result: CodeRunnerResult = "empty";

    @LitElement.query(".grader-code-cell-output")
    outputElement!: HTMLElement;

    constructor() {
        super();
    }

    createRenderRoot() {
        return this;
    }

    reset() {
        this.result = "empty";
        this.performUpdate();
    }

    setRunResult(c: CodeRunnerResult) {
        this.result = c;
        this.performUpdate();
    }

    getOutputElement() {
        return this.outputElement;
    }

    render() {
        return html`
            <style>
                .grader-code-feedback-bar {
                    border: 1px solid #999;
                    background-color: #fafafa;
                    padding: 0.2em;
                    font-size: 0.8em;
                }
                .grader-code-feedback-bar.success {
                    border: 1px solid #999;
                    background-color: #baedc0;
                }

                .grader-code-feedback-bar.fail {
                    border: 1px solid #999;
                    background-color: #eba0ac;
                }
            </style>
            ${this.result === "empty" ? undefined : 
                html`
                <div class="grader-code-feedback-bar ${this.result}">
                    ${
                        this.result === "success" ? 
                        html`<div>
                            ✅ Code ran succesfully
                        </div>`:
                        html`<div>
                            ❌ An exception was thrown (tests failed)
                        </div>`
                    }
                </div>`
            }
            <div class="grader-code-cell-output"></div>`
    }
}