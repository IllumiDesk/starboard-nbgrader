import { NotebookContent } from "starboard-notebook/dist/src/types";
import { textToNotebookContent } from "starboard-notebook/dist/src/content/parsing"
import { notebookContentToText } from "starboard-notebook/dist/src/content/serialization"
import { NBGraderMetadata, StarboardGraderMetadata } from "./types";

/**
 * Transforms given notebook content, replacing python and markdown cells that have nbgrader metadata with a special grader cell type.
 */
export function upgradeNBGraderCells(nb: NotebookContent | string) {
    if (typeof nb === "string") {
        nb = textToNotebookContent(nb);
    } else {
        // Poor man's copy
        nb = JSON.parse(JSON.stringify(nb));
    }

    // Make TS happy
    if (typeof nb === "string") {
        return;
    }

    nb.cells.forEach(c => {
        const md = c.metadata.nbgrader as NBGraderMetadata;
        if (md) {
            if (!md.grade && md.locked && !md.task && !md.solution) {
                // This cell is only "locked", it is not a "task" per say.
                c.metadata.properties.nbgrader_locked = true;
            }
            else {
                (c.metadata.starboard_grader as StarboardGraderMetadata) = {original_cell_type: c.cellType as "markdown" | "python"};
                c.cellType = "grader";
            }
        }
    });

    return notebookContentToText(nb);
}

export function prependPluginLoaderCell(nb: string) {
    const content = textToNotebookContent(nb);

    content.cells = [
        {
            cellType: "javascript",
            metadata: {id: "nbgrader-init-cell", properties:{run_on_load: true}},
            id: "nbgrader-init-cell",
            textContent: `const baseImport = (path) => import(document.querySelector("base").href + path);
const {default: plugin} = await baseImport("../dist/plugin.js");
runtime.controls.registerPlugin(plugin);
runtime.controls.removeCell("nbgrader-init-cell");`
        }, ...content.cells]

    return notebookContentToText(content);
}

/**
 * Swaps out grader cells with their basic python/markdown representation for conversion back to ipynb
 * @param nb
 */
export function preprocessGraderCellsForJupystar(nb: NotebookContent | string) {

    if (typeof nb === "string") {
        nb = textToNotebookContent(nb);
    } else {
        // Poor man's copy
        nb = JSON.parse(JSON.stringify(nb));
    }

    // Make TS happy
    if (typeof nb === "string") {
        return;
    }

    nb.cells.forEach(c => {
        if (c.cellType === "grader") {
            const md = c.metadata.starboard_grader as StarboardGraderMetadata | undefined;

            c.cellType = md === undefined ? "python" : md.original_cell_type;
            delete (c.metadata as any).starboard_grader;
        } else if (c.metadata.properties.nbgrader_locked) {
            const md: NBGraderMetadata = {
                locked: true,
                grade_id: c.id,
                grade: false,
                solution: false,
                schema_version: 3,
                task: false,
            }
            c.metadata.nbgrader = md;
        }
    });

    return notebookContentToText(nb);
}
