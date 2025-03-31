# @vroskus/build-web

Tool for building javascript web packages. A replacement of CRA based on esbuild.

## Installation

Call:

`npm install -D @vroskus/build-web`

`yarn add -D @vroskus/build-web`

## Usage

1. Just run ```build-web``` with args:

Define static type to use (optional) (default: "tsc"):
```-t, --types <flow | tsc>```

Input file path (optional) (default: "src/index.js"):
```-i, --input-file <path>```

Index.html file dir path (optional) (default: "public"):
```-x, --index-html-dir <path>```

Output dir path (optional) (default: "dist"):
```-o, --output-dir <path>```

Output file name (optional) (default: "index.js"):
```-f, --output-file <filename>```

Generate source map files (optional) (default: false):
```-s, --sourcemap```

Instruct code to collect coverage data (optional) (default: false):
```-c, --coverage```

Debug configuration (optional) (default: false):
```-d, --debug```
