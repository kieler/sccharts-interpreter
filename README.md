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
npm run build-all
```

Note that `npm run generate-lang` which is called as part of `npm run build-all` can run into errors depending on your version of node. For example it runs fine on node 26.0.0 but errors out on 26.7.0. 

### webui
There is a web interface for the interpreter which you lauch like this: 

```bash
npm start
```

### cli
If you want to use it locally in the terminal there is a cli.

```bash
npm run cli testing/sctx/ABO.sctx
```
It reads inputs in JSON format from stdin every tick and prints the state of all variables as a response.

You can also provide a json list as input as a command line argument. It will then run a tick for each entry in the array. For expample
```bash
npm run cli testing/sctx/ABO.sctx '[{"A": true}, {"A": false},{"A": true}]'
```

### sctx2json 
Part of this interpreter convcerts the sctx files of SCCharts to a json intermediary (This is done for testing purposes). You can also manually call that step. If you leave out an output path, the json will be printed to stdout. The cli also excpets the json files as input.

```bash
npm run convert-sctx testing/sctx/ABO.sctx testing/json/ABO.json
```

### tests
For the tests to work properly a version of the Kieler Compiler has to be downloaded (currently from this branch https://github.com/kieler/semantics/tree/dam/json) and its location configured in the `kico_config.json`. It is used to compare the results of the interpreter against that of the compiler.

The tests are written in python and require `uv` to be installed.  
```bash
npm run test
```

To see options see
```
npm run test -- -h
```

## structure
### interpreter
![fig1](docs/img/structure_basic.png)
