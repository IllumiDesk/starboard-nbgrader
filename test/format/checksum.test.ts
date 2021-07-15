import { readFileSync } from "fs-extra";
import { upgradeNBGraderCells } from "../../src/format/converter";
import { computeGraderCellChecksum } from "../../src/format/checksum";
import { convertJupyterStringToStarboardString } from "jupystar";
import { textToNotebookContent } from "starboard-notebook/dist/src/content/parsing";

interface Fixtures {
  [filename: string]: { checksums: string[] };
}

const TEST_NOTEBOOKS_FOLDER_PATH = "./test_notebooks";
const fixtures: Fixtures = JSON.parse(readFileSync("test/fixtures/test_notebooks_fixtures.json").toString());

describe("Cell checksumming", () => {
  for (const [filename, fixture] of Object.entries(fixtures)) {
    const nbFileContent = readFileSync(TEST_NOTEBOOKS_FOLDER_PATH + "/" + filename).toString();

    const sbContent = upgradeNBGraderCells(convertJupyterStringToStarboardString(nbFileContent));
    const sb = textToNotebookContent(sbContent);

    test(`Checksums in ${filename}`, () => {
      expect(sb.cells).toHaveLength(fixture.checksums.length);

      for (let i = 0; i < sb.cells.length; i++) {
        const cell = sb.cells[i];
        let computedChecksum = "";

        if (cell.metadata.nbgrader !== undefined) {
          computedChecksum = computeGraderCellChecksum(sb.cells[i]);
        }
        expect(computedChecksum).toEqual(fixture.checksums[i]);
      }
    });
  }
});
