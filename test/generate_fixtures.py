# TODO

import nbformat
import nbgrader.utils
from os import path
import json



test_notebooks_folder = "../test_notebooks/"

test_notebooks = ["tinynb.json", "haiku-and-squares.ipynb", "release/my-assignment/Adjacency Matrices.ipynb", "source/my-assignment/Adjacency Matrices.ipynb"]
output_file = "fixtures/test_notebooks_fixtures.json"

def generate():
    print("Generating fixtures")

    fixtures_dict = dict()

    for nb_path in test_notebooks:
        nb = nbformat.read(test_notebooks_folder + nb_path, 4)
        checksums = []

        for cell in nb.cells:

            if "nbgrader" not in cell.metadata:
                checksum = ""
            else:
                checksum = nbgrader.utils.compute_checksum(cell)
            checksums.append(checksum)

        fixtures_dict[nb_path] = {
            "checksums": checksums
        }

    with open(output_file, "w") as f:
        json.dump(fixtures_dict, f)



if __name__ == "__main__":
    fixtures_file_contents = generate()

