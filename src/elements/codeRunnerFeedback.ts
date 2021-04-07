import {LitElement, LitHtml} from "starboard-notebook/dist/src/runtime/esm/exports/libraries";

export type CodeRunnerResult = "empty" | "success" | "test-success" | "test-fail" | "fail" | "running" | "running-setup";

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
            ${this.result === "empty" ? undefined : 
                html`
                <div class="grader-code-feedback-bar ${this.result}">
                    ${
                        (() => {
                            switch(this.result) {
                                case("success"): {
                                    return html`<div>
                                    ✅ Code ran succesfully
                                    </div>`
                                }
                                case("fail"): {
                                    return html`<div>
                                    ❌ An error was thrown
                                    </div>`
                                }
                                case("test-success"): {
                                    return html`<div>
                                    ✅ Tests passed
                                    </div>`
                                }
                                case("test-fail"): {
                                    return html`<div>
                                    ❌ Tests failed.
                                    </div>`
                                }
                                case("running"): {
                                    return html`<div>
                                    ⚙️ Cell is running..
                                    </div>`
                                }
                                case("running-setup"): {
                                    return html`<div>
                                    ⚙️ Cell is running.. (First time Python setup.. please wait)
                                    </div>`
                                }
                            }
                           
                        })()
                    }
                </div>`
            }
            <div class="grader-code-cell-output"></div>`
    }
}
