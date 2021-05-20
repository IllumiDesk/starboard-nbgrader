import { NotebookContent } from "starboard-notebook/dist/src/types";
import { textToNotebookContent } from "starboard-notebook/dist/src/content/parsing";
import { notebookContentToText } from "starboard-notebook/dist/src/content/serialization";
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

  nb.cells.forEach((c) => {
    const md = c.metadata.nbgrader as NBGraderMetadata;
    const originalCellType = c.cellType as "markdown" | "python";
    if (md) {
      // Has NBGrader metadata
      if (!md.grade && !md.task && !md.solution) {
        // This is a "basic" cell.
        (c.metadata.starboard_grader as StarboardGraderMetadata) = {
          original_cell_type: originalCellType,
          is_basic_cell: true,
        };
        // c.metadata.properties.nbgrader_locked = md.locked;
      } else {
        (c.metadata.starboard_grader as StarboardGraderMetadata) = {
          original_cell_type: originalCellType,
          is_basic_cell: false,
        };
      }
      c.cellType = "grader";
    } else {
      // We translate non-nbgrader cells too to their grader equivalent.
      if (c.cellType === "markdown" || c.cellType === "python") {
        c.cellType = "grader";
        c.metadata.starboard_grader = {
          origin_cell_type: c.cellType,
          is_basic_cell: true,
        };
      }
    }
  });

  return notebookContentToText(nb);
}

export function prependPluginLoaderMetadata(nb: string, opts: { pluginUrl: string; jupyterBaseUrl: string }) {
  const content = textToNotebookContent(nb);
  content.metadata.starboard = content.metadata.starboard || {};

  if (!content.metadata.starboard.plugins!) {
    content.metadata.starboard.plugins = [];
  }
  content.metadata.starboard!.plugins.push({
    src: opts.pluginUrl,
    args: { jupyter: { serverSettings: { baseUrl: opts.jupyterBaseUrl } } },
  });

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

  nb.cells.forEach((c) => {
    if (c.cellType === "grader") {
      const md = c.metadata.starboard_grader as StarboardGraderMetadata | undefined;

      c.cellType = md === undefined ? "python" : md.original_cell_type;
      delete (c.metadata as any).starboard_grader;
    } /* Note(gzuidhof): nbgrader_locked is probably not necessary anymore.
    else if (c.metadata.properties.nbgrader_locked) {
      const md: NBGraderMetadata = {
        locked: true,
        grade_id: c.id,
        grade: false,
        solution: false,
        schema_version: 3,
        task: false,
      };
      c.metadata.nbgrader = md;
    }*/
  });

  return notebookContentToText(nb);
}
