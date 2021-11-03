import * as ts from 'typescript';
import { ProgramTransformerExtras, PluginConfig } from 'ts-patch';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { Namespace, Service, Message, Property, Method, Type } from './definitions';
import { SyntaxKindMap } from './SyntaxKindMap';
import { SourceFileResovler } from './resolvers';
import {} from 'ts-expose-internals';

interface Target {
    cs: string | string[];
    ts: string | string[];
    py: string | string[];
    ja: string | string[];
    /** List of selected namespaces */
    ns: string[];
    csCode?: string;
    tsCode?: string;
    pyCode?: string;
    jaCode?: string;
}

interface RPC {
    rpc: Target[];
}

function readRPCConfig() {
  let data = fs.readFileSync('uni-rpc.yaml', 'utf-8');
  return yaml.parse(data) as RPC;
}

function EnsureDirectory(directory: string) {
  if (fs.existsSync(directory) && fs.statSync(directory).isDirectory()) return;
  // check parent
  EnsureDirectory(path.dirname(directory));
  // create directory
  fs.mkdirSync(directory);
}

function WriteFile(filename: string, data: string) {
  EnsureDirectory(path.dirname(filename));
  fs.writeFileSync(filename, data, 'utf-8');
}

function RemoveDirectory(directory: string) {
  if (fs.existsSync(directory) && fs.statSync(directory).isDirectory()) {
    fs.rmSync(directory, { recursive: true, force: true});
  }
}

function *getPaths(value: string | string[]): IterableIterator<string> {
  if (typeof value == 'undefined') {
  }
  else if (Array.isArray(value)) {
    for (let item of value) {
      yield path.normalize(String(item));
    }
  } else {
    yield path.normalize(String(value));
  }
}

function ClearTargets(config: RPC) {
  let pathSet = new Set<string>();
  for (let target of config.rpc) {
    for (let item of getPaths(target.cs)) {
      pathSet.add(item);
    }
    for (let item of getPaths(target.ts)) {
      pathSet.add(item);
    }
    for (let item of getPaths(target.py)) {
      pathSet.add(item);
    }
    for (let item of getPaths(target.ja)) {
      pathSet.add(item);
    }
  }
  for (let item of pathSet) {
    RemoveDirectory(item);
  }
}


const config = readRPCConfig();
const builder = new SourceFileResovler();



function emit(sourceFile: ts.SourceFile) {

  console.log("sourceFile['SourceFileCount']:", global['SourceFileCount']);

  global['SourceFileCount'] = global['SourceFileCount'] - 1;

  console.log('./uni-rpc.yaml', config);
  ClearTargets(config);
  if (sourceFile.fileName.toLowerCase().endsWith('.ts')) {
    builder.resolveSourceFile(sourceFile);
  }

  if (global['SourceFileCount'] == 0) {
    console.log('builder.Children.size:', builder.Children.size);
    console.log(JSON.stringify(builder.Children, null, 4));
    WriteFile('./uni-rpc.json', JSON.stringify(builder.Children, null, 4));
  }
  
  return sourceFile;
}

const transformer: ts.TransformerFactory<ts.SourceFile> = () => {
    return sourceFile => {
      return ts.factory.updateSourceFile(emit(sourceFile), [
        ...sourceFile.statements,
      ]);
    };
  };
  
export default transformer;


// let filecount: number = 0;

// function writeOutput() {
//   console.log(JSON.stringify(builder.Children, null, 4));
//   WriteFile('./uni-rpc.json', JSON.stringify(builder.Children, null, 4));
// }

// function transformAst(this: typeof ts, context: ts.TransformationContext) {
//   const tsInstance = this;
//   /* Transformer Function */
//   return (sourceFile: ts.SourceFile) => {
//     builder.resolveSourceFile(sourceFile);
//     if (filecount-- == 0) writeOutput();
//     return sourceFile;
//   }
// }

// function getPatchedHost(
//   maybeHost: ts.CompilerHost | undefined,
//   tsInstance: typeof ts,
//   compilerOptions: ts.CompilerOptions
// ): ts.CompilerHost & { fileCache: Map<string, ts.SourceFile> }
// {
//   const fileCache = new Map();
//   const compilerHost = maybeHost ?? tsInstance.createCompilerHost(compilerOptions, true);
//   const originalGetSourceFile = compilerHost.getSourceFile;

//   return Object.assign(compilerHost, {
//     getSourceFile(fileName: string, languageVersion: ts.ScriptTarget) {
//       fileName = ts.sys.resolvePath(fileName);
//       console.log('fileName:', fileName);
//       if (fileCache.has(fileName)) return fileCache.get(fileName);

//       const sourceFile = originalGetSourceFile.apply(void 0, Array.from(arguments) as any);
//       fileCache.set(fileName, sourceFile);

//       return sourceFile;
//     },
//     fileCache
//   });
// }


// export default function(program: ts.Program, 
//   host: ts.CompilerHost | undefined, 
//   options: PluginConfig, 
//   { ts: tsInstance }: ProgramTransformerExtras) {
//   console.log(typeof program);
  
//   for (let sourceFile of program.getSourceFiles()) {
//     if (sourceFile.fileName.toLowerCase().endsWith('.d.ts')) continue;
//     if (sourceFile.fileName.toLowerCase().endsWith('.ts')) {
//       ++filecount;
//       console.log('sourcefile.text:',  sourceFile.text);
//     } 
//   }



//   const compilerOptions = program.getCompilerOptions();
//   const compilerHost = getPatchedHost(host, tsInstance, compilerOptions);
//   const rootFileNames = program.getRootFileNames().map(tsInstance.normalizePath);

//   /* Transform AST */
//   const transformedSource = tsInstance.transform(
//     /* sourceFiles */ program.getSourceFiles().filter(sourceFile => rootFileNames.includes(sourceFile.fileName)),
//     /* transformers */ [ transformAst.bind(tsInstance) ],
//     compilerOptions
//   ).transformed;

//   /* Render modified files and create new SourceFiles for them to use in host's cache */
//   // const { printFile } = tsInstance.createPrinter();
//   // console.log('printFile', printFile)
//   // for (const sourceFile of transformedSource) {
//   //   const { fileName, languageVersion } = sourceFile;
//   //   const updatedSourceFile = tsInstance.createSourceFile(fileName, printFile(sourceFile), languageVersion);
//   //   compilerHost.fileCache.set(fileName, updatedSourceFile);
//   // }

//   /* Re-create Program instance */
//   return tsInstance.createProgram(rootFileNames, compilerOptions, compilerHost);

// }
