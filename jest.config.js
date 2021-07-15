module.exports = {
    "testEnvironment": "node",
    "transform": {
        '^.+\\.(ts|tsx)?$': 'ts-jest',
        "^.+\\.(js|jsx)$": "babel-jest",
    },
    "transformIgnorePatterns": [
        "node_modules/(?!(starboard-notebook)|(jupystar))"
    ],
    "testRegex": "(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$",
    "moduleFileExtensions": [
        "ts",
        "tsx",
        "js"
    ],
    "coveragePathIgnorePatterns": [
        "/node_modules/",
        "/test/"
    ],
    "coverageThreshold": {
        "global": {
            "branches": 50,
            "functions": 50,
            "lines": 50,
            "statements": 50
        }
    },
    setupFiles: ["<rootDir>/test/setup.ts"],
    "testPathIgnorePatterns": [
        "/dist/"
    ],
    "collectCoverageFrom": [
        "src/**/*.{js,ts}"
    ]
}
