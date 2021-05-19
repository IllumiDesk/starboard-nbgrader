import { Runtime } from "starboard-notebook/dist/src/types";

declare const runtime: Runtime;

export function registerStudentLockedCellProperty() {
  runtime.definitions.cellProperties.register("nbgrader_locked", {
    name: "Locked for students",
    textEnabled: "Locked for students: they won't be able to edit this cell.",
    textDisabled: "Lock cell for students (stop them from editing)",
    cellProperty: "nbgrader_locked",
    icon: "bi bi-key-fill",
  });
}
