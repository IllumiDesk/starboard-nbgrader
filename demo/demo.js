import { convertJupyterStringToStarboardString, convertStarboardStringToJupyterString } from "https://cdn.skypack.dev/jupystar";
import { StarboardEmbed } from "https://cdn.skypack.dev/starboard-wrap@0.3.2";
import { upgradeNBGraderCells, preprocessGraderCellsForJupystar, prependPluginLoaderMetadata } from "../dist/converter.js";

let currentStarboardNotebookContent = ``;

currentStarboardNotebookContent = `
---
ipynb_metadata:
  celltoolbar: Create Assignment
  kernelspec:
    display_name: Python 3
    language: python
    name: python3
  language_info:
    codemirror_mode:
      name: ipython
      version: 3
    file_extension: .py
    mimetype: text/x-python
    name: python
    nbconvert_exporter: python
    pygments_lexer: ipython3
    version: 3.8.6
jupystar:
  version: 0.2.1
---
# %%--- [grader]
# id: smart-plymouth
# nbgrader:
#   grade: false
#   grade_id: cell-6aca377eade36d42
#   locked: true
#   schema_version: 3
#   solution: false
#   task: false
# starboard_grader:
#   original_cell_type: markdown
#   is_basic_cell: true
# ---%%
## Write a haiku below (1 point)
# %%--- [grader]
# id: handed-stopping
# nbgrader:
#   grade: true
#   grade_id: haiku-answer
#   locked: false
#   points: 1
#   schema_version: 3
#   solution: true
#   task: false
# starboard_grader:
#   original_cell_type: markdown
#   is_basic_cell: false
# ---%%
Haiku goes here
# %%--- [grader]
# id: immediate-jumping
# nbgrader:
#   grade: false
#   grade_id: cell-b98411dc1ebcd1a4
#   locked: true
#   points: 2
#   schema_version: 3
#   solution: false
#   task: true
# starboard_grader:
#   original_cell_type: markdown
#   is_basic_cell: false
# ---%%
Another task.. worth two points, that is spread along multiple cells and manually graded.
# %%--- [grader]
# id: cooperative-healthcare
# nbgrader:
#   grade: false
#   grade_id: cell-ff14169315ad87d3
#   locked: false
#   schema_version: 3
#   solution: true
#   task: false
# starboard_grader:
#   original_cell_type: python
#   is_basic_cell: false
# ---%%
def squares(n):
    """Compute the squares of numbers from 1 to n"""

    ### BEGIN SOLUTION
    if n < 1:
        raise ValueError("n must be greater than or equal to 1")
    return [i**2 for i in range(1, n+1)]
    ### END SOLUTION
# %%--- [grader]
# id: processed-pepper
# nbgrader:
#   grade: true
#   grade_id: cell-dee87c78c1785f81
#   locked: true
#   points: 3
#   schema_version: 3
#   solution: false
#   task: false
# starboard_grader:
#   original_cell_type: python
#   is_basic_cell: false
# ---%%
from nose.tools import assert_equal

assert_equal(squares(1), [1])
assert_equal(squares(2), [1, 4])

### BEGIN HIDDEN TESTS
assert_equal(squares(3), [1, 4, 9])
### END HIDDEN TESTS
# %%--- [grader]
# properties: {}
# id: decent-diana
# nbgrader:
#   grade: true
#   grade_id: cell-36cd318c1c136ece
#   locked: true
#   points: 4
#   schema_version: 3
#   solution: false
#   task: false
# starboard_grader:
#   original_cell_type: python
#   is_basic_cell: false
# ---%%
from nose.tools import assert_raises
assert_raises(ValueError, squares, 0)
assert_raises(ValueError, squares, -1)
`

let currentJupyterNotebookContent = ``;

function updateContent(content) {
    document.querySelector("#sb-notebook-content-display").innerText = content;
    currentJupyterNotebookContent = convertStarboardStringToJupyterString(preprocessGraderCellsForJupystar(content));
    document.querySelector("#ipynb-notebook-content-display").innerText = currentJupyterNotebookContent;
}

function save() {
    alert("Save was requested from the notebook");
}

function readFileAsText(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.addEventListener("load", (event) => {
            resolve(event.target.result);
        })
        reader.readAsText(file);
    })
}

function downloadIpynbAsFile() {
    var element = document.createElement('a');
    element.setAttribute("href", 'data:text/plain;charset=utf-8,' + encodeURIComponent(currentJupyterNotebookContent));
    element.setAttribute('download', "starboard-grader-output.ipynb");

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

const mount = document.querySelector("#mount-point");


function createNotebook(content) {
    if (mount.children.length > 0) {
        mount.removeChild(mount.children[0]);
    }

    const href = window.location.href;
    const baseUrl = href.substring(0, href.lastIndexOf('/')) + "/";

    const pluginUrl = baseUrl + "../dist/plugin.js";
    const jupyterBaseUrl = "http://localhost:8888";

    const el = new StarboardEmbed({
        notebookContent: prependPluginLoaderMetadata(content, { pluginUrl: pluginUrl, jupyterBaseUrl: jupyterBaseUrl }),
        src: "https://unpkg.com/starboard-notebook@0.10.1/dist/index.html",
        // src: "http://localhost:9001/index.html",
        baseUrl: baseUrl,

        onSaveMessage(payload) {
            save(payload.content);
        },

        onContentUpdateMessage(payload) {
            updateContent(payload.content);
        }
    });
    mount.appendChild(el);
}

const fileSelector = document.getElementById('file-selector');
fileSelector.addEventListener('change', async (event) => {
    const text = await readFileAsText(event.target.files[0]);

    currentStarboardNotebookContent = upgradeNBGraderCells(convertJupyterStringToStarboardString(text));
    currentJupyterNotebookContent = text;
    updateContent(currentStarboardNotebookContent);

    createNotebook(currentStarboardNotebookContent)
});


if (currentStarboardNotebookContent !== "") {
    createNotebook(currentStarboardNotebookContent);
    updateContent(currentStarboardNotebookContent);
}

const downloadButton = document.querySelector("#download-button");
downloadButton.addEventListener("click", () => downloadIpynbAsFile());