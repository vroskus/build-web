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
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import esbuild from 'esbuild';
import sassPlugin from 'esbuild-plugin-sass';
import flowPlugin from 'esbuild-plugin-flow';
import tscPlugin from 'esbuild-plugin-tsc';
import { esbuildPluginIstanbul, } from 'esbuild-plugin-istanbul';
import browserslist from 'browserslist';
import { resolveToEsbuildTarget, } from 'esbuild-plugin-browserslist';
// Enums
var Types;
(function (Types) {
    Types["flow"] = "flow";
    Types["tsc"] = "tsc";
})(Types || (Types = {}));
const milliseconds = 1000000000;
const preparedOptions = ({ coverage, customOptions, customPlugins, inputFilePath, outputDirPath, outputFileName, sourcemap, types, }) => {
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
    return Object.assign(Object.assign({}, customOptions), { bundle: true, entryPoints: [
            path.join(process.cwd(), inputFilePath),
        ], loader: {
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
        }, minify: true, outfile: path.join(process.cwd(), `${outputDirPath}/${outputFileName}`), plugins,
        sourcemap, target: resolveToEsbuildTarget(browserslist(), {
            printUnknownTargets: false,
        }) });
};
const build = (_a) => __awaiter(void 0, [_a], void 0, function* ({ options, }) {
    yield esbuild.build(options);
});
const copyFiles = (_a) => __awaiter(void 0, [_a], void 0, function* ({ indexHtmlDirPath, outputDirPath, }) {
    fs.cpSync(path.join(process.cwd(), indexHtmlDirPath), path.join(process.cwd(), outputDirPath), {
        recursive: true,
    });
    const indexHtmlFilePath = path.join(process.cwd(), `${outputDirPath}/index.html`);
    let indexHtmlFile = fs.readFileSync(indexHtmlFilePath, {
        encoding: 'utf8',
        flag: 'r',
    });
    indexHtmlFile = indexHtmlFile.replace(/\?ts/g, `?${new Date().getTime()}`);
    fs.writeFileSync(indexHtmlFilePath, indexHtmlFile, {
        encoding: 'utf8',
    });
});
const serve = (_a) => __awaiter(void 0, [_a], void 0, function* ({ options, outputDirPath, servePort, }) {
    const packageName = process.env.npm_package_name || 'Unknown package';
    const packageVersion = process.env.npm_package_version || 'Unknown version';
    const ctx = yield esbuild.context(Object.assign(Object.assign({}, options), { minify: false, plugins: [
            ...options.plugins,
            {
                name: 'watch',
                setup(b) {
                    const initialStartTime = 0;
                    let start = [
                        initialStartTime,
                        initialStartTime,
                    ];
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
    http
        .createServer((req, res) => {
        const serverOptions = {
            headers: req.headers,
            hostname: innerServer.hosts[0],
            method: req.method,
            path: req.url,
            port: innerServer.port,
        };
        const proxyReq = http.request(serverOptions, (proxyRes) => {
            const notFountStatus = 404;
            const errorStatus = 0;
            if (proxyRes.statusCode === notFountStatus) {
                const index = fs.createReadStream(`${outputDirPath}/index.html`);
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
export const bundle = (config) => __awaiter(void 0, void 0, void 0, function* () {
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
export default {
    bundle,
};
