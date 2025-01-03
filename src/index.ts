/* eslint-disable no-console */

import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import esbuild from 'esbuild';
import sassPlugin from 'esbuild-plugin-sass';
import flowPlugin from 'esbuild-plugin-flow';
import tscPlugin from 'esbuild-plugin-tsc';
import {
  esbuildPluginIstanbul,
} from 'esbuild-plugin-istanbul';
import browserslist from 'browserslist';
import {
  resolveToEsbuildTarget,
} from 'esbuild-plugin-browserslist';

const milliseconds: number = 1000000000;

const preparedSettings = ({
  coverage,
  customPlugins,
  inputFilePath,
  outputDirPath,
  sourcemap,
  types,
}) => {
  const plugins = [
    types === 'flow' ? flowPlugin(/\.js$|\.jsx$/) : tscPlugin(),
    sassPlugin(),
  ];

  if (Array.isArray(customPlugins)) {
    customPlugins.forEach((customPlugin) => {
      plugins.push(customPlugin);
    });
  }

  if (coverage) {
    plugins.push(esbuildPluginIstanbul({
      filter: /\.[cm]?js$/,
      loader: 'js',
      name: 'istanbul-loader-js',
    }));

    plugins.push(esbuildPluginIstanbul({
      filter: /\.jsx$/,
      loader: 'jsx',
      name: 'istanbul-loader-jsx',
    }));

    plugins.push(esbuildPluginIstanbul({
      filter: /\.[cm]?ts$/,
      loader: 'ts',
      name: 'istanbul-loader-ts',
    }));

    plugins.push(esbuildPluginIstanbul({
      filter: /\.tsx$/,
      loader: 'tsx',
      name: 'istanbul-loader-tsx',
    }));
  }

  return {
    bundle: true,
    entryPoints: [path.join(
      process.cwd(),
      inputFilePath,
    )],
    loader: {
      '.eot': 'dataurl',
      '.gif': 'dataurl',
      '.jpeg': 'dataurl',
      '.jpg': 'dataurl',
      '.png': 'dataurl',
      '.svg': 'dataurl',
      '.ttf': 'dataurl',
      '.woff': 'dataurl',
      '.woff2': 'dataurl',
    },
    minify: true,
    outfile: path.join(
      process.cwd(),
      `${outputDirPath}/index.js`,
    ),
    plugins,
    sourcemap,
    target: resolveToEsbuildTarget(
      browserslist(),
      {
        printUnknownTargets: false,
      },
    ),
  };
};

const build = async ({
  settings,
}) => {
  await esbuild.build(settings);
};

const copyFiles = async ({
  indexHtmlDirPath,
  outputDirPath,
}) => {
  fs.cpSync(
    path.join(
      process.cwd(),
      indexHtmlDirPath,
    ),
    path.join(
      process.cwd(),
      outputDirPath,
    ),
    {
      recursive: true,
    },
  );

  const indexHtmlFilePath = path.join(
    process.cwd(),
    `${outputDirPath}/index.html`,
  );

  let indexHtmlFile = fs.readFileSync(
    indexHtmlFilePath,
    {
      encoding: 'utf8',
      flag: 'r',
    },
  );

  indexHtmlFile = indexHtmlFile.replace(
    /\?ts/g,
    `?${new Date().getTime()}`,
  );

  fs.writeFileSync(
    indexHtmlFilePath,
    indexHtmlFile,
    {
      encoding: 'utf8',
    },
  );
};

const serve = async ({
  outputDirPath,
  servePort,
  settings,
}) => {
  const packageName = process.env.npm_package_name || 'Unknown package';
  const packageVersion = process.env.npm_package_version || 'Unknown version';

  const ctx = await esbuild.context({
    ...settings,
    minify: false,
    plugins: [
      ...settings.plugins,
      {
        name: 'watch',
        setup(b) {
          const initialStartTime: number = 0;
          let start: [number, number] = [initialStartTime, initialStartTime];

          b.onStart(() => {
            start = process.hrtime();
            console.log('Starting build...');
          });

          b.onEnd(() => {
            const end = process.hrtime(start);

            const duration = (end[0] * milliseconds + end[1]) / milliseconds;
            const digitsAfterComma: number = 2;

            console.log(
              `Built in: ${duration.toFixed(digitsAfterComma)}s`,
            );
          });
        },
      },
    ],
  });

  const innerServer = await ctx.serve({
    servedir: outputDirPath,
  });

  http
    .createServer((req, res) => {
      const options = {
        headers: req.headers,
        hostname: innerServer.host,
        method: req.method,
        path: req.url,
        port: innerServer.port,
      };

      const proxyReq = http.request(
        options,
        (proxyRes) => {
          const notFountStatus: number = 404;
          const errorStatus: number = 0;

          if (proxyRes.statusCode === notFountStatus) {
            const index = fs.createReadStream(`${outputDirPath}/index.html`);

            return index.pipe(res);
          }

          res.writeHead(
            proxyRes.statusCode || errorStatus,
            proxyRes.headers,
          );
          proxyRes.pipe(
            res,
            {
              end: true,
            },
          );

          return null;
        },
      );

      req.pipe(
        proxyReq,
        {
          end: true,
        },
      );
    })
    .listen(
      Number(servePort),
      () => console.info(`${packageName}:${packageVersion} is listening on ${servePort}`),
    );
};

const getConfigValue = (
  configParam,
  envParam,
  defaultValue,
) => configParam || process.env[envParam] || defaultValue;

export const bundle = async (config) => {
  const {
    customPlugins,
    debug,
  } = config;

  const noneServerPort = 0;

  const coverage = getConfigValue(
    config.coverage,
    'COVERAGE',
    false,
  );
  const indexHtmlDirPath = getConfigValue(
    config.indexHtmlDirPath,
    'INDEX_PATH',
    'public',
  );
  const inputFilePath = getConfigValue(
    config.inputFilePath,
    'SOURCE_FILE_PATH',
    'src/index.js',
  );
  const outputDirPath = getConfigValue(
    config.outputDirPath,
    'BUILD_PATH',
    'dist',
  );
  const servePort = getConfigValue(
    config.servePort,
    'SERVE',
    noneServerPort,
  );
  const sourcemap = getConfigValue(
    config.sourcemap,
    'SOURCEMAP',
    false,
  );
  const types = getConfigValue(
    config.types,
    'TYPES',
    'tsc',
  );

  const settings = preparedSettings({
    coverage,
    customPlugins,
    inputFilePath,
    outputDirPath,
    sourcemap,
    types,
  });

  if (debug) {
    console.log(
      'build config: ',
      config,
    );
    console.log(
      'build settings: ',
      settings,
    );
  }

  await copyFiles({
    indexHtmlDirPath,
    outputDirPath,
  });

  if (servePort) {
    await serve({
      outputDirPath,
      servePort,
      settings,
    });
  } else {
    await build({
      settings,
    });
  }
};

export default {
  bundle,
};
