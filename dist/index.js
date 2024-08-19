"use strict";
/* eslint-disable no-console */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = __importDefault(require("node:http"));
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const esbuild_1 = __importDefault(require("esbuild"));
const esbuild_plugin_sass_1 = __importDefault(require("esbuild-plugin-sass"));
const esbuild_plugin_flow_1 = __importDefault(require("esbuild-plugin-flow"));
const esbuild_plugin_tsc_1 = __importDefault(require("esbuild-plugin-tsc"));
const esbuild_plugin_istanbul_1 = require("esbuild-plugin-istanbul");
const browserslist_1 = __importDefault(require("browserslist"));
const esbuild_plugin_browserslist_1 = require("esbuild-plugin-browserslist");
const preparedSettings = ({ coverage, customPlugins, inputFilePath, outputDirPath, sourcemap, types, }) => {
    const plugins = [
        types === 'flow' ? (0, esbuild_plugin_flow_1.default)(/\.js$|\.jsx$/) : (0, esbuild_plugin_tsc_1.default)(),
        (0, esbuild_plugin_sass_1.default)(),
    ];
    if (Array.isArray(customPlugins)) {
        customPlugins.forEach((customPlugin) => {
            plugins.push(customPlugin);
        });
    }
    if (coverage) {
        plugins.push((0, esbuild_plugin_istanbul_1.esbuildPluginIstanbul)({
            filter: /\.[cm]?js$/,
            loader: 'js',
            name: 'istanbul-loader-js',
        }));
        plugins.push((0, esbuild_plugin_istanbul_1.esbuildPluginIstanbul)({
            filter: /\.jsx$/,
            loader: 'jsx',
            name: 'istanbul-loader-jsx',
        }));
        plugins.push((0, esbuild_plugin_istanbul_1.esbuildPluginIstanbul)({
            filter: /\.[cm]?ts$/,
            loader: 'ts',
            name: 'istanbul-loader-ts',
        }));
        plugins.push((0, esbuild_plugin_istanbul_1.esbuildPluginIstanbul)({
            filter: /\.tsx$/,
            loader: 'tsx',
            name: 'istanbul-loader-tsx',
        }));
    }
    return {
        bundle: true,
        entryPoints: [node_path_1.default.join(process.cwd(), inputFilePath)],
        loader: {
            '.eot': 'dataurl',
            '.png': 'dataurl',
            '.svg': 'dataurl',
            '.ttf': 'dataurl',
            '.woff': 'dataurl',
            '.woff2': 'dataurl',
        },
        minify: true,
        outfile: node_path_1.default.join(process.cwd(), `${outputDirPath}/index.js`),
        plugins,
        sourcemap,
        target: (0, esbuild_plugin_browserslist_1.resolveToEsbuildTarget)((0, browserslist_1.default)(), {
            printUnknownTargets: false,
        }),
    };
};
const build = (_a) => __awaiter(void 0, [_a], void 0, function* ({ settings, }) {
    yield esbuild_1.default.build(settings);
});
const copyFiles = (_a) => __awaiter(void 0, [_a], void 0, function* ({ indexHtmlDirPath, outputDirPath, }) {
    node_fs_1.default.cpSync(node_path_1.default.join(process.cwd(), indexHtmlDirPath), node_path_1.default.join(process.cwd(), outputDirPath), {
        recursive: true,
    });
    const indexHtmlFilePath = node_path_1.default.join(process.cwd(), `${outputDirPath}/index.html`);
    let indexHtmlFile = node_fs_1.default.readFileSync(indexHtmlFilePath, {
        encoding: 'utf8',
        flag: 'r',
    });
    indexHtmlFile = indexHtmlFile.replace(/\?ts/g, `?${new Date().getTime()}`);
    node_fs_1.default.writeFileSync(indexHtmlFilePath, indexHtmlFile, {
        encoding: 'utf8',
    });
});
const serve = (_a) => __awaiter(void 0, [_a], void 0, function* ({ outputDirPath, servePort, settings, }) {
    const packageName = process.env.npm_package_name || 'Unknown package';
    const packageVersion = process.env.npm_package_version || 'Unknown version';
    const ctx = yield esbuild_1.default.context(Object.assign(Object.assign({}, settings), { minify: false, plugins: [
            ...settings.plugins,
            {
                name: 'watch',
                setup(b) {
                    let start = [0, 0];
                    b.onStart(() => {
                        start = process.hrtime();
                        console.log('Starting build...');
                    });
                    b.onEnd(() => {
                        const end = process.hrtime(start);
                        const duration = (end[0] * 1000000000 + end[1]) / 1000000000;
                        console.log(`Built in: ${duration.toFixed(2)}s`);
                    });
                },
            },
        ], sourcemap: false }));
    const innerServer = yield ctx.serve({
        servedir: outputDirPath,
    });
    node_http_1.default
        .createServer((req, res) => {
        const options = {
            headers: req.headers,
            hostname: innerServer.host,
            method: req.method,
            path: req.url,
            port: innerServer.port,
        };
        const proxyReq = node_http_1.default.request(options, (proxyRes) => {
            if (proxyRes.statusCode === 404) {
                const index = node_fs_1.default.createReadStream(`${outputDirPath}/index.html`);
                return index.pipe(res);
            }
            res.writeHead(proxyRes.statusCode || 0, proxyRes.headers);
            proxyRes.pipe(res, {
                end: true,
            });
            return null;
        });
        req.pipe(proxyReq, {
            end: true,
        });
    })
        .listen(Number(servePort), () => console.info(`${packageName}:${packageVersion} is listening on ${servePort}`));
});
const getConfigValue = (configParam, envParam, defaultValue) => configParam || process.env[envParam] || defaultValue;
const bundle = (config) => __awaiter(void 0, void 0, void 0, function* () {
    const { customPlugins, debug, } = config;
    const coverage = getConfigValue(config.coverage, 'COVERAGE', false);
    const indexHtmlDirPath = getConfigValue(config.indexHtmlDirPath, 'INDEX_PATH', 'public');
    const inputFilePath = getConfigValue(config.inputFilePath, 'SOURCE_FILE_PATH', 'src/index.js');
    const outputDirPath = getConfigValue(config.outputDirPath, 'BUILD_PATH', 'dist');
    const servePort = getConfigValue(config.servePort, 'SERVE', 0);
    const sourcemap = getConfigValue(config.sourcemap, 'SOURCEMAP', true);
    const types = getConfigValue(config.types, 'TYPES', 'tsc');
    const settings = preparedSettings({
        coverage,
        customPlugins,
        inputFilePath,
        outputDirPath,
        sourcemap,
        types,
    });
    if (debug) {
        console.log('build config: ', config);
        console.log('build settings: ', settings);
    }
    yield copyFiles({
        indexHtmlDirPath,
        outputDirPath,
    });
    if (servePort) {
        yield serve({
            outputDirPath,
            servePort,
            settings,
        });
    }
    else {
        yield build({
            settings,
        });
    }
});
exports.default = {
    bundle,
};
