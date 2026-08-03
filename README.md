# sccharts-interpreter

## disclaimers
I put them here so they can't be missed.
For some reason there is currently a bug that means generating langiuums files from the grammer only works with some versions of node.  
I tested it with 26.0.0 and 26.5.1. From these two only 26.0.0 works. For all the rest of the code both are perfectly fine, but just for the language generation (which only has to be done once if you set it up new and all the needed files are included as gernerated versions in the git) use 26.0.0.  
I do not know why this happens.

## usage
### setup
To set up the project, run:

```bash
npm install
npm run build
```

### webui
```bash
npm start
```

The main usgae of the interpreter is via a webui. It is accessed via a web server and the interpreter runs locally in the browser.

### cli
If you want to use it locally in the terminal there is a cli.

By default it expects two arguments. The first is a path to the JSON and the second is your input list in JSON format. For expample
```bash
npm run cli testing/sctx/IM.json '[{"A": true}, {"A": false},{"A": true}]'
```

There is also an interactive mode, which can be called like:
```bash
npm run cli testing/sctx/IM.json -- -i
```
It reads inputs in JSON format from stdin every tick and prints the state of all variables as a response.


### tests
For the tests to work properly a version of the Kieler Compiler has to be downloaded (currently from this branch https://github.com/kieler/semantics/tree/dam/json) and its location configured in the `kico_config.json`. It is used to compare the results of the interpreter against that of the compiler.

The tests are written in python and require `uv` to be installed.  
```bash
npm run test
```

## structure
![fig1](docs/img/structure_basic.png)
