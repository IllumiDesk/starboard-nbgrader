import {convertJupyterStringToStarboardString, convertStarboardStringToJupyterString} from "https://cdn.skypack.dev/jupystar";
import {StarboardNotebookIFrame} from "https://cdn.skypack.dev/starboard-wrap";
import {upgradeNBGraderCells, preprocessGraderCellsForJupystar, prependPluginLoaderCell} from "http://localhost:8080/dist/converter.js";

let currentStarboardNotebookContent = `
# %%--- [javascript]
# properties:
#   run_on_load: true
# ---%%
const {initPlugin} = await import("http://localhost:8080/dist/index.js");
initPlugin();

# %% [grader]
Hello!
`;
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
        reader.addEventListener('load', (event) => {
            resolve(event.target.result);
        })
        reader.readAsText(file);
    }) 
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
        src: "https://unpkg.com/starboard-notebook@0.7.14/dist/index.html",

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