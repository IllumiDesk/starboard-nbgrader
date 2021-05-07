// Some global state for the plugin..

export type PythonGraderCellExecutionMode = "pyodide" | "jupyter"

let executionMode: PythonGraderCellExecutionMode = "pyodide";

export function getPythonExecutionMode() {
    return executionMode;
}

export function setPythonExecutionMode(m: PythonGraderCellExecutionMode) {
    executionMode = m;
}