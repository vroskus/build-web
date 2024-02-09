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
  .option('-s, --sourcemap', 'generate source map files')
  .option('-c, --coverage', 'instruct code to collect coverage data')
  .option('-d, --serve <port>', 'start development server on port')
  .version(packageJson.version, '-v, --version')
  .parse(process.argv);

const options = program.opts();

const {
  coverage,
  indexHtmlDir,
  inputFile,
  outputDir,
  serve,
  sourcemap,
  types,
} = options;

const config = {
  coverage,
  indexHtmlDirPath: indexHtmlDir,
  inputFilePath: inputFile,
  outputDirPath: outputDir,
  servePort: serve,
  sourcemap,
  types,
};

bundle(config);
