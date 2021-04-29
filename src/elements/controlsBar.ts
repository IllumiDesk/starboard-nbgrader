const LitElement = window.runtime.exports.libraries.LitElement;
const html = LitElement.html;

@LitElement.customElement('starboard-grader-bar')
export class StarboardGraderBar extends LitElement.LitElement  {

    private executionMode: "jupyter" | "pyodide" = "pyodide";

    constructor() {
        super();
    }

    createRenderRoot() {
        return this;
    }

    disconnectedCallback() {
        super.disconnectedCallback();
    }

    render() {
        return html`
                <section class="starboard-nbgrader-interface py-2 px-3 my-2">
                    <details>
                    <summary class="d-flex justify-content-between flex-wrap">
                        <div class="d-flex align-items-center flex-wrap">
                            <h2 class="h5 mb-0 me-2">Assignment Creator</h2>
                        </div>
                        <div>        
                            <span class="badge ${this.executionMode === "jupyter" ? "bg-orange": "bg-green"}" >
                                ${this.executionMode}
                            </span>
                        </div>
                    </summary>
                    </details>
                </section>
        `;
    }

}
