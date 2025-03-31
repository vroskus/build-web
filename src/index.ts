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

// Types
import type {
  BuildOptions,
  Plugin,
} from 'esbuild';

// Enums
enum Types {
  flow = 'flow',
  tsc = 'tsc',
}

type $Config = {
  coverage: boolean;
  customOptions?: BuildOptions;
  customPlugins?: Array<Plugin>;
  debug?: boolean;
  indexHtmlDirPath?: string;
  inputFilePath?: string;
  outputDirPath?: string;
  outputFileName?: string;
  servePort?: number;
  sourcemap?: boolean;
  types?: Types;
};

const milliseconds: number = 1000000000;

const preparedOptions = ({
  coverage,
  customOptions,
  customPlugins,
  inputFilePath,
  outputDirPath,
  outputFileName,
  sourcemap,
  types,
}: {
  coverage: boolean;
  customOptions?: BuildOptions;
  customPlugins?: Array<Plugin>;
  inputFilePath: string;
  outputDirPath: string;
  outputFileName: string;
  sourcemap: boolean;
  types: Types;
}): BuildOptions => {
  const plugins = [
    types === Types.flow ? flowPlugin(/\.js$|\.jsx$/) : tscPlugin(),
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
    ...customOptions,
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
      `${outputDirPath}/${outputFileName}`,
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
  options,
}: {
  options: BuildOptions;
}): Promise<void> => {
  await esbuild.build(options);
};

const copyFiles = async ({
  indexHtmlDirPath,
  outputDirPath,
}): Promise<void> => {
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
  options,
  outputDirPath,
  servePort,
}): Promise<void> => {
  const packageName = process.env.npm_package_name || 'Unknown package';
  const packageVersion = process.env.npm_package_version || 'Unknown version';

  const ctx = await esbuild.context({
    ...options,
    minify: false,
    plugins: [
      ...options.plugins,
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
      const serverOptions = {
        headers: req.headers,
        hostname: innerServer.hosts[0],
        method: req.method,
        path: req.url,
        port: innerServer.port,
      };

      const proxyReq = http.request(
        serverOptions,
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

export const bundle = async (
  config: $Config,
): Promise<void> => {
  const {
    customOptions,
    customPlugins,
    debug,
  } = config;

  const noneServerPort: number = 0;

  const coverage = getConfigValue(
    config.coverage,
    'COVERAGE',
    false,
  );
  const indexHtmlDirPath: string = getConfigValue(
    config.indexHtmlDirPath,
    'INDEX_PATH',
    'public',
  );
  const inputFilePath: string = getConfigValue(
    config.inputFilePath,
    'SOURCE_FILE_PATH',
    'src/index.js',
  );
  const outputDirPath: string = getConfigValue(
    config.outputDirPath,
    'BUILD_PATH',
    'dist',
  );
  const outputFileName: string = getConfigValue(
    config.outputFileName,
    'BUILD_FILE',
    'index.js',
  );
  const servePort: number = getConfigValue(
    config.servePort,
    'SERVE',
    noneServerPort,
  );
  const sourcemap: boolean = getConfigValue(
    config.sourcemap,
    'SOURCEMAP',
    false,
  );
  const types: Types = getConfigValue(
    config.types,
    'TYPES',
    Types.tsc,
  );

  const options = preparedOptions({
    coverage,
    customOptions,
    customPlugins,
    inputFilePath,
    outputDirPath,
    outputFileName,
    sourcemap,
    types,
  });

  if (debug) {
    console.log(
      'build config: ',
      config,
    );
    console.log(
      'build options: ',
      options,
    );
  }

  await copyFiles({
    indexHtmlDirPath,
    outputDirPath,
  });

  if (servePort) {
    await serve({
      options,
      outputDirPath,
      servePort,
    });
  } else {
    await build({
      options,
    });
  }
};

export default {
  bundle,
};
