import {default as iFrameResizer} from "https://cdn.skypack.dev/iframe-resizer/js/iframeResizer";
import {convertJupyterStringToStarboardString} from "https://cdn.skypack.dev/jupystar";

let currentStarboardNotebookContent = ``;
let currentJupyterNotebookContent = ``;

function updateContent(content) {
    document.querySelector("#sb-notebook-content-display").innerText = content;
    // TODO autotranslate back to ipynb, needs Jupystar update
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

window.iFrameComponent = iFrameResizer({
    autoResize: true, 
    checkOrigin: [
    "http://localhost:9001",
    "https://unpkg.com",
    ],
    onMessage: (messageData) => {
        // This message is sent when the notebook is ready
        // Respond to this message with the initial content of the notebook.
        //
        // The iFrame will send this message multiple times until you set the content.
        // Note that you don't have to reply synchronously: you can wait for the content to be loaded from say a remote server
        if (messageData.message.type === "SIGNAL_READY") {
            console.log("Notebook ready for content")
        // Whenever the notebook content gets changed (e.g. a character is typed)
        // the entire content is sent to the parent website.
        } else if (messageData.message.type === "NOTEBOOK_CONTENT_UPDATE") {
            updateContent(messageData.message.data);

        // This signal is sent when a save shortcut (e.g. cmd+s on mac) is pressed.
        } else if (messageData.message.type === "SAVE") {
            updateContent(messageData.message.data);
            save(); // Implement your own save function..
        }
    },
    onReady: () => {},
    inPageLinks: true,
}, document.querySelector("#notebook-iframe"));


const fileSelector = document.getElementById('file-selector');
fileSelector.addEventListener('change', async (event) => {
    const text = await readFileAsText(event.target.files[0]);

    currentStarboardNotebookContent = convertJupyterStringToStarboardString(text);
    currentJupyterNotebookContent = text;
    updateContent(currentStarboardNotebookContent);

    window.iFrameComponent[0].iFrameResizer.sendMessage({
        type: "SET_NOTEBOOK_CONTENT", data: currentStarboardNotebookContent
    })
});
