import angular from '@analogjs/vite-plugin-angular';
import tsconfigPaths from 'vite-tsconfig-paths';

export const baseConfig = {
  plugins: [angular(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'forks',
    include: ['**/*.{spec,test}.ts'],
    passWithNoTests: true,
    setupFiles: ['test-setup.ts'],
  },
};
