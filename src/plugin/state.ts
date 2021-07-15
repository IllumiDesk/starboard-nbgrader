// Some global state for the plugin..

export type PythonGraderCellExecutionMode = "pyodide" | "jupyter";
export type GraderPluginMode = "grader" | "assignment-creator" | "student";

let executionMode: PythonGraderCellExecutionMode = "pyodide";
let pluginMode: GraderPluginMode = "assignment-creator";

export function getPythonExecutionMode() {
  return executionMode;
}

export function setPythonExecutionMode(m: PythonGraderCellExecutionMode) {
  executionMode = m;
}

export function getGraderPluginMode() {
  return pluginMode;
}

export function setGraderPluginMode(m: GraderPluginMode) {
  pluginMode = m;
}
