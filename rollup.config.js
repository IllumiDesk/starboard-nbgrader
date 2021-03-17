import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';

export default [
{
  input: `src/plugin.ts`,
  output: [
    { file: 'dist/plugin.js', format: 'es' },
    { file: 'dist/plugin.min.js', format: 'es', plugins: [terser()] },
    { file: 'dist/plugin.cjs', format: 'cjs' }
  ],
  plugins: [
    typescript({
      include: [
        './src/**/*.ts',
      ],
    }),
    resolve(),
    commonjs(),
  ]
},
{
  input: `src/converter.ts`,
  output: [
    { file: 'dist/converter.js', format: 'es' },
  ],
  plugins: [
    typescript({
      include: [
        './src/**/*.ts',
      ],
    }),
    resolve(),
    commonjs(),
  ]
}
];