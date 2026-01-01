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

const fs = require('fs');
const path = require('path');

const { execSync } = require('child_process');

esbuild
  .build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node22',
    outfile: 'dist/index.js',
    external: ['firebase-admin', 'firebase-functions'],
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
  .then(() => {
    // Create package.json for deployment
    const packageJson = require('./package.json');
    const deployPackageJson = {
      name: packageJson.name,
      engines: packageJson.engines,
      main: 'index.js',
      dependencies: packageJson.dependencies,
      private: true,
    };
    fs.writeFileSync(
      path.join(__dirname, 'dist', 'package.json'),
      JSON.stringify(deployPackageJson, null, 2)
    );
    console.log('Created dist/package.json');

    // Install dependencies in dist
    console.log('Installing dependencies in dist...');
    execSync('npm install', { cwd: path.join(__dirname, 'dist'), stdio: 'inherit' });
  })
  .catch(() => process.exit(1));
