import { NotebookContent } from "starboard-notebook/dist/src/runtime";
import { textToNotebookContent } from "starboard-notebook/dist/src/content/parsing"
import { notebookContentToText } from "starboard-notebook/dist/src/content/serialization"
import { StarboardGraderMetadata } from "./types";

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
        // TODO fix cell metadata type in starboard-notebook to allow for unknown extra fields.
        if ((c.metadata as any).nbgrader) {
            ((c.metadata as any).starboard_grader as StarboardGraderMetadata) = {original_cell_type: c.cellType as "markdown" | "python"};
            c.cellType = "grader";
        }
    });

    return notebookContentToText(nb);
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
            c.cellType = ((c.metadata as any).starboard_grader as StarboardGraderMetadata).original_cell_type;
            delete (c.metadata as any).starboard_grader;
        }
    });

    return notebookContentToText(nb);
}