import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const external = ['@peter.naydenov/notice', '@peter.naydenov/signals', '@peter.naydenov/walk', 'ask-for-promise'];

export default [
  // CommonJS build
  {
    input: 'src/main.js',
    output: {
      file: 'dist/data-pool.cjs',
      format: 'cjs',
      exports: 'default'
    },
    external,
    plugins: [resolve(), commonjs()]
  },
  // ESM build
  {
    input: 'src/main.js',
    output: {
      file: 'dist/data-pool.esm.mjs',
      format: 'esm'
    },
    external,
    plugins: [resolve(), commonjs()]
  },
  // UMD build (bundled)
  {
    input: 'src/main.js',
    output: {
      file: 'dist/data-pool.umd.js',
      format: 'umd',
      name: 'dataPool',
      exports: 'default'
    },
    plugins: [resolve(), commonjs()]
  }
];