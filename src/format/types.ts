export interface NBGraderMetadata {
  grade: boolean;
  grade_id: string;
  locked: boolean;
  schema_version: 3;
  solution: boolean;
  task: boolean;
  points?: number;
}

export interface StarboardGraderMetadata {
  original_cell_type: "python" | "markdown";
  // A basic cell is a plain python or markdown cell, i.e. not a cell that has grading or something.
  is_basic_cell: boolean;
}
