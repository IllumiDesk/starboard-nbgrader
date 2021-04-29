import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import esbuild from 'rollup-plugin-esbuild'
import { terser } from 'rollup-plugin-terser';

const CleanCSS = require('clean-css');

// Inline plugin to load css as minified string
const css = () => {return {
  name: "css",
  transform(code, id) {
    if (id.endsWith(".css")) {
      const minified = new CleanCSS({level: 2}).minify(code);
      return `export default ${JSON.stringify(minified.styles)}`;
    }
  }
}}

export default [
{
  input: `src/plugin.ts`,
  output: [
    { file: 'dist/plugin.js', format: 'es' },
    // { file: 'dist/plugin.min.js', format: 'es', plugins: [terser()] },
    // { file: 'dist/plugin.cjs', format: 'cjs' }
  ],
  plugins: [
    css(),
    esbuild({
      target: "es2018"
    }),
    // typescript({
    //   include: [
    //     './src/**/*.ts',
    //   ],
    // }),
    resolve(),
    // commonjs(),
  ]
},
{
  input: `src/converter.ts`,
  output: [
    { file: 'dist/converter.js', format: 'es' },
  ],
  plugins: [
    // typescript({
    //   include: [
    //     './src/**/*.ts',
    //   ],
    // }),
    esbuild({
      target: "es2018"
    }),
    resolve(),
    commonjs(),
  ]
}
];