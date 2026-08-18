/**
 * Node-half library build for the quota panel host package. The package
 * carries no browser bundle, so one plain library config suffices (the root
 * workspace config would also build it, but a local config keeps
 * `pnpm --filter … bundle` scoped to this package).
 */
export default {
  name: '@deepseek-ai/dsh-quota-panel',
  entry: ['lib/types/index.js'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
}
