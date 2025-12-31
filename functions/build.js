/* eslint-disable @typescript-eslint/no-var-requires */
const esbuild = require('esbuild');

const mockAssetsPlugin = {
  name: 'mock-assets',
  setup(build) {
    // Handle .md files imported as ReactComponent
    build.onLoad({ filter: /\.md$/ }, async () => {
      return {
        contents: `
          export const ReactComponent = () => null;
          export default "";
        `,
        loader: 'js',
      };
    });

    // Handle .svg files imported as ReactComponent
    build.onLoad({ filter: /\.svg$/ }, async () => {
      return {
        contents: `
            export const ReactComponent = () => null;
            export default "";
          `,
        loader: 'js',
      };
    });
  },
};

esbuild
  .build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: 'lib/index.js',
    external: ['firebase-admin', 'firebase-functions', 'react', 'react-dom', 'framer-motion'],
    logLevel: 'info',
    define: {
      'import.meta.env.MODE': '"production"',
      'import.meta.env': '{"MODE":"production"}',
    },
    plugins: [mockAssetsPlugin],
    loader: {
      '.css': 'text',
    },
  })
  .catch(() => process.exit(1));
