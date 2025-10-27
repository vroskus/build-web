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
exports.bundle = void 0;
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
// Enums
var Types;
(function (Types) {
    Types["flow"] = "flow";
    Types["tsc"] = "tsc";
})(Types || (Types = {}));
const milliseconds = 1000000000;
const preparedOptions = ({ coverage, customOptions, customPlugins, inputFilePath, outputDirPath, outputFileName, sourcemap, types, }) => {
    const plugins = [
        types === Types.flow ? (0, esbuild_plugin_flow_1.default)(/\.js$|\.jsx$/) : (0, esbuild_plugin_tsc_1.default)(),
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
    return Object.assign(Object.assign({}, customOptions), { bundle: true, entryPoints: [node_path_1.default.join(process.cwd(), inputFilePath)], loader: {
            '.eot': 'dataurl',
            '.gif': 'dataurl',
            '.jpeg': 'dataurl',
            '.jpg': 'dataurl',
            '.otf': 'dataurl',
            '.png': 'dataurl',
            '.svg': 'dataurl',
            '.ttf': 'dataurl',
            '.woff': 'dataurl',
            '.woff2': 'dataurl',
        }, minify: true, outfile: node_path_1.default.join(process.cwd(), `${outputDirPath}/${outputFileName}`), plugins,
        sourcemap, target: (0, esbuild_plugin_browserslist_1.resolveToEsbuildTarget)((0, browserslist_1.default)(), {
            printUnknownTargets: false,
        }) });
};
const build = (_a) => __awaiter(void 0, [_a], void 0, function* ({ options, }) {
    yield esbuild_1.default.build(options);
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
const serve = (_a) => __awaiter(void 0, [_a], void 0, function* ({ options, outputDirPath, servePort, }) {
    const packageName = process.env.npm_package_name || 'Unknown package';
    const packageVersion = process.env.npm_package_version || 'Unknown version';
    const ctx = yield esbuild_1.default.context(Object.assign(Object.assign({}, options), { minify: false, plugins: [
            ...options.plugins,
            {
                name: 'watch',
                setup(b) {
                    const initialStartTime = 0;
                    let start = [initialStartTime, initialStartTime];
                    b.onStart(() => {
                        start = process.hrtime();
                        console.log('Starting build...');
                    });
                    b.onEnd(() => {
                        const end = process.hrtime(start);
                        const duration = (end[0] * milliseconds + end[1]) / milliseconds;
                        const digitsAfterComma = 2;
                        console.log(`Built in: ${duration.toFixed(digitsAfterComma)}s`);
                    });
                },
            },
        ] }));
    const innerServer = yield ctx.serve({
        servedir: outputDirPath,
    });
    node_http_1.default
        .createServer((req, res) => {
        const serverOptions = {
            headers: req.headers,
            hostname: innerServer.hosts[0],
            method: req.method,
            path: req.url,
            port: innerServer.port,
        };
        const proxyReq = node_http_1.default.request(serverOptions, (proxyRes) => {
            const notFountStatus = 404;
            const errorStatus = 0;
            if (proxyRes.statusCode === notFountStatus) {
                const index = node_fs_1.default.createReadStream(`${outputDirPath}/index.html`);
                return index.pipe(res);
            }
            res.writeHead(proxyRes.statusCode || errorStatus, proxyRes.headers);
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
    const { customOptions, customPlugins, debug, } = config;
    const noneServerPort = 0;
    const coverage = getConfigValue(config.coverage, 'COVERAGE', false);
    const indexHtmlDirPath = getConfigValue(config.indexHtmlDirPath, 'INDEX_PATH', 'public');
    const inputFilePath = getConfigValue(config.inputFilePath, 'SOURCE_FILE_PATH', 'src/index.js');
    const outputDirPath = getConfigValue(config.outputDirPath, 'BUILD_PATH', 'dist');
    const outputFileName = getConfigValue(config.outputFileName, 'BUILD_FILE', 'index.js');
    const servePort = getConfigValue(config.servePort, 'SERVE', noneServerPort);
    const sourcemap = getConfigValue(config.sourcemap, 'SOURCEMAP', false);
    const types = getConfigValue(config.types, 'TYPES', Types.tsc);
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
        console.log('build config: ', config);
        console.log('build options: ', options);
    }
    yield copyFiles({
        indexHtmlDirPath,
        outputDirPath,
    });
    if (servePort) {
        yield serve({
            options,
            outputDirPath,
            servePort,
        });
    }
    else {
        yield build({
            options,
        });
    }
});
exports.bundle = bundle;
exports.default = {
    bundle: exports.bundle,
};
