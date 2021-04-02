import {convertJupyterStringToStarboardString, convertStarboardStringToJupyterString} from "https://cdn.skypack.dev/jupystar";
import {StarboardNotebookIFrame} from "https://cdn.skypack.dev/starboard-wrap";
import {upgradeNBGraderCells, preprocessGraderCellsForJupystar, prependPluginLoaderCell} from "../dist/converter.js";

let currentStarboardNotebookContent = `
# %%--- [javascript]
# properties:
#   run_on_load: true
# ---%%
const {initPlugin} = await import("../dist/plugin.js");
initPlugin();

# %% [grader]
Hello!
`;


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
# %%--- [markdown]
# properties:
#   nbgrader_locked: true
# id: smart-plymouth
# nbgrader:
#   grade: false
#   grade_id: cell-6aca377eade36d42
#   locked: true
#   schema_version: 3
#   solution: false
#   task: false
# ---%%
## Write a haiku below (1 point)
# %%--- [grader]
# properties: {}
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
# ---%%
Haiku goes here
# %%--- [grader]
# properties: {}
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
# ---%%
Another task.. worth two points, that is spread along multiple cells and manually graded.
# %%--- [grader]
# properties: {}
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
# ---%%
def squares(n):
    """Compute the squares of numbers from 1 to n"""
    
    ### BEGIN SOLUTION
    if n < 1:
        raise ValueError("n must be greater than or equal to 1")
    return [i**2 for i in range(1, n+1)]
    ### END SOLUTION
# %%--- [grader]
# properties: {}
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
# ---%%
import nose
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

    const el = new StarboardNotebookIFrame({
        // TODO: we should not need to prepend this loader cell like this, starboard-notebook doesn't
        // have a clean way to load plugins at runtime level yet, coming soon!
        notebookContent: prependPluginLoaderCell(content),
        src: "https://unpkg.com/starboard-notebook@0.8.2/dist/index.html",

        onSaveMessage(payload) {
            save(payload.content);
        },

        onContentUpdateMessage(payload) {
            updateContent(payload.content);
        }
    });
    el.style.width = "100%";
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