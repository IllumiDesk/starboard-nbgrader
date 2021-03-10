export interface NBGraderMetadata {
    grade: boolean,
    grade_id: string,
    locked: boolean,
    schema_version: 3,
    solution: boolean,
    task: boolean
}

export interface StarboardGraderMetadata {
    original_cell_type: "python" | "markdown";
}