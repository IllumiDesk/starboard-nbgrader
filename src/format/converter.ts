import { textToNotebookContent } from "starboard-notebook/dist/src/content/parsing";
import { notebookContentToText } from "starboard-notebook/dist/src/content/serialization";
import { GraderPluginMode } from "../plugin/state";
import { NBGraderMetadata, StarboardGraderMetadata } from "./types";

/**
 * Transforms given notebook content, replacing python and markdown cells that have nbgrader metadata with a special grader cell type.
 */
export function upgradeNBGraderCells(nbContent: string) {
  const nb = textToNotebookContent(nbContent);

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
        const originalCellType = c.cellType;
        c.cellType = "grader";
        c.metadata.starboard_grader = {
          original_cell_type: originalCellType,
          is_basic_cell: true,
        };
      }
    }
  });

  return notebookContentToText(nb);
}

export function prependPluginLoaderMetadata(nb: string, opts: { pluginUrl: string; jupyterBaseUrl: string; mode: GraderPluginMode }) {
  const content = textToNotebookContent(nb);
  content.metadata.starboard = content.metadata.starboard || {};

  if (!content.metadata.starboard.plugins!) {
    content.metadata.starboard.plugins = [];
  }
  content.metadata.starboard!.plugins.push({
    src: opts.pluginUrl,
    args: {
      mode: opts.mode,
      jupyter: { serverSettings: { baseUrl: opts.jupyterBaseUrl } },
    },
  });

  return notebookContentToText(content);
}

/**
 * Swaps out grader cells with their basic python/markdown representation for conversion back to ipynb
 * @param nb
 */
export function preprocessGraderCellsForJupystar(nbcontent: string) {
  const nb = textToNotebookContent(nbcontent);

  nb.cells.forEach((c) => {
    if (c.cellType === "grader") {
      const md = c.metadata.starboard_grader as StarboardGraderMetadata | undefined;

      c.cellType = md === undefined ? "python" : md.original_cell_type;
      delete (c.metadata as any).starboard_grader;
    }
  });

  return notebookContentToText(nb);
}
