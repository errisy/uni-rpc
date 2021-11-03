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
  // console.log('./uni-rpc.yaml', config);
  ClearTargets(config);
  let lowerFilename = sourceFile.fileName.toLowerCase();

  if (lowerFilename.endsWith('.ts') && !lowerFilename.endsWith('.d.ts')) {
    global['SourceFileCount'] = global['SourceFileCount'] - 1;
    builder.resolveSourceFile(sourceFile);
    if (global['SourceFileCount'] == 0) {
      console.log('builder.Children.size:', builder.Children.size);
      let results: Namespace[] = [];
      for (let key of builder.Children.keys()) {
        // console.log(JSON.stringify(builder.Children.get(key), null, 4));
        results.push(builder.Children.get(key));
      }
      WriteFile('./uni-rpc.json', JSON.stringify(results, null, 4));
    }
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