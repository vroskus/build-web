#! /usr/bin/env node

const {
  program,
} = require('commander');
const {
  bundle,
} = require('../dist/index.js');

const packageJson = require('../package.json');

program
  .usage('[OPTIONS]...')
  .option('-t, --types <flow | tsc>', 'define static type to use', 'tsc')
  .option('-i, --input-file <path>', 'input file path', 'src/index.js')
  .option('-x, --index-html-dir <path>', 'index.html file dir path', 'public')
  .option('-o, --output-dir <path>', 'output dir path', 'dist')
  .option('-m, --sourcemap', 'generate source map files')
  .option('-c, --coverage', 'instruct code to collect coverage data')
  .option('-s, --serve <port>', 'start development server on port')
  .option('-d, --debug', 'debug build process')
  .version(packageJson.version, '-v, --version')
  .parse(process.argv);

const options = program.opts();

const {
  coverage,
  debug,
  indexHtmlDir,
  inputFile,
  outputDir,
  serve,
  sourcemap,
  types,
} = options;

const config = {
  coverage,
  debug,
  indexHtmlDirPath: indexHtmlDir,
  inputFilePath: inputFile,
  outputDirPath: outputDir,
  servePort: serve,
  sourcemap,
  types,
};

bundle(config);
