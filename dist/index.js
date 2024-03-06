var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.js
var import_http = __toESM(require("http"));
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var import_esbuild = __toESM(require("esbuild"));
var import_esbuild_plugin_sass = __toESM(require("esbuild-plugin-sass"));
var import_esbuild_plugin_flow = __toESM(require("esbuild-plugin-flow"));
var import_esbuild_plugin_tsc = __toESM(require("esbuild-plugin-tsc"));
var import_esbuild_plugin_istanbul = require("esbuild-plugin-istanbul");
var import_browserslist = __toESM(require("browserslist"));
var import_esbuild_plugin_browserslist = require("esbuild-plugin-browserslist");
var preparedSettings = ({
  coverage,
  customPlugins,
  inputFilePath,
  outputDirPath,
  sourcemap,
  types
}) => {
  const plugins = [
    types === "flow" ? (0, import_esbuild_plugin_flow.default)(/\.js$|\.jsx$/) : (0, import_esbuild_plugin_tsc.default)(),
    (0, import_esbuild_plugin_sass.default)()
  ];
  if (Array.isArray(customPlugins)) {
    customPlugins.forEach((customPlugin) => {
      plugins.push(customPlugin);
    });
  }
  if (coverage) {
    plugins.push((0, import_esbuild_plugin_istanbul.esbuildPluginIstanbul)({
      filter: /\.[cm]?js$/,
      loader: "js",
      name: "istanbul-loader-js"
    }));
    plugins.push((0, import_esbuild_plugin_istanbul.esbuildPluginIstanbul)({
      filter: /\.jsx$/,
      loader: "jsx",
      name: "istanbul-loader-jsx"
    }));
    plugins.push((0, import_esbuild_plugin_istanbul.esbuildPluginIstanbul)({
      filter: /\.[cm]?ts$/,
      loader: "ts",
      name: "istanbul-loader-ts"
    }));
    plugins.push((0, import_esbuild_plugin_istanbul.esbuildPluginIstanbul)({
      filter: /\.tsx$/,
      loader: "tsx",
      name: "istanbul-loader-tsx"
    }));
  }
  return {
    bundle: true,
    entryPoints: [import_path.default.join(
      process.cwd(),
      inputFilePath
    )],
    loader: {
      ".eot": "dataurl",
      ".js": "jsx",
      ".png": "dataurl",
      ".svg": "dataurl",
      ".ttf": "dataurl",
      ".woff": "dataurl",
      ".woff2": "dataurl"
    },
    minify: true,
    outfile: import_path.default.join(
      process.cwd(),
      `${outputDirPath}/index.js`
    ),
    plugins,
    sourcemap,
    target: (0, import_esbuild_plugin_browserslist.resolveToEsbuildTarget)((0, import_browserslist.default)(), {
      printUnknownTargets: false
    })
  };
};
var build = async ({
  settings
}) => {
  await import_esbuild.default.build(settings);
};
var copyFiles = async ({
  indexHtmlDirPath,
  outputDirPath
}) => {
  import_fs.default.cpSync(
    import_path.default.join(
      process.cwd(),
      indexHtmlDirPath
    ),
    import_path.default.join(
      process.cwd(),
      outputDirPath
    ),
    {
      recursive: true
    }
  );
  const indexHtmlFilePath = import_path.default.join(
    process.cwd(),
    `${outputDirPath}/index.html`
  );
  let indexHtmlFile = import_fs.default.readFileSync(
    indexHtmlFilePath,
    {
      encoding: "utf8",
      flag: "r"
    }
  );
  indexHtmlFile = indexHtmlFile.replace(
    /\?ts/g,
    `?${(/* @__PURE__ */ new Date()).getTime()}`
  );
  import_fs.default.writeFileSync(
    indexHtmlFilePath,
    indexHtmlFile,
    {
      encoding: "utf8"
    }
  );
};
var serve = async ({
  outputDirPath,
  servePort,
  settings
}) => {
  const packageName = process.env.npm_package_name || "Unknown package";
  const packageVersion = process.env.npm_package_version || "Unknown version";
  const ctx = await import_esbuild.default.context({
    ...settings,
    minify: false,
    plugins: [
      ...settings.plugins,
      {
        name: "watch",
        setup(b) {
          let start = 0;
          b.onStart(() => {
            start = process.hrtime();
            console.log("Starting build...");
          });
          b.onEnd(() => {
            const end = process.hrtime(start);
            const duration = (end[0] * 1e9 + end[1]) / 1e9;
            console.log(
              `Built in: ${duration.toFixed(2)}s`
            );
          });
        }
      }
    ],
    sourcemap: false
  });
  const innerServer = await ctx.serve({
    servedir: outputDirPath
  });
  import_http.default.createServer((req, res) => {
    const options = {
      headers: req.headers,
      hostname: innerServer.host,
      method: req.method,
      path: req.url,
      port: innerServer.port
    };
    const proxyReq = import_http.default.request(
      options,
      (proxyRes) => {
        if (proxyRes.statusCode === 404) {
          const index = import_fs.default.createReadStream(`${outputDirPath}/index.html`);
          return index.pipe(res);
        }
        res.writeHead(
          proxyRes.statusCode,
          proxyRes.headers
        );
        proxyRes.pipe(
          res,
          {
            end: true
          }
        );
        return null;
      }
    );
    req.pipe(
      proxyReq,
      {
        end: true
      }
    );
  }).listen(
    Number(servePort),
    () => console.info(`${packageName}:${packageVersion} is listening on ${servePort}`)
  );
};
var getConfigValue = (configParam, envParam, defaultValue) => configParam || process.env[envParam] || defaultValue;
var bundle = async (config) => {
  const {
    customPlugins,
    debug
  } = config;
  const coverage = getConfigValue(
    config.coverage,
    "COVERAGE",
    false
  );
  const indexHtmlDirPath = getConfigValue(
    config.indexHtmlDirPath,
    "INDEX_PATH",
    "public"
  );
  const inputFilePath = getConfigValue(
    config.inputFilePath,
    "SOURCE_FILE_PATH",
    "src/index.js"
  );
  const outputDirPath = getConfigValue(
    config.outputDirPath,
    "BUILD_PATH",
    "dist"
  );
  const servePort = getConfigValue(
    config.servePort,
    "SERVE",
    0
  );
  const sourcemap = getConfigValue(
    config.sourcemap,
    "SOURCEMAP",
    true
  );
  const types = getConfigValue(
    config.types,
    "TYPES",
    "tsc"
  );
  const settings = preparedSettings({
    coverage,
    customPlugins,
    inputFilePath,
    outputDirPath,
    sourcemap,
    types
  });
  if (debug) {
    console.log("build config: ", config);
    console.log("build settings: ", settings);
  }
  await copyFiles({
    indexHtmlDirPath,
    outputDirPath
  });
  if (servePort) {
    await serve({
      outputDirPath,
      servePort,
      settings
    });
  } else {
    await build({
      settings
    });
  }
};
module.exports = {
  bundle
};
