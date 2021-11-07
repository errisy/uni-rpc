import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { Namespace, Service, Message, Property, Method, Type } from './definitions';
import { SyntaxKindMap } from './SyntaxKindMap';
import { SourceFileResovler } from './resolvers';
import {} from 'ts-expose-internals';
import { RPC, Target } from './rpc-configuration';

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
const resolver = new SourceFileResovler();

const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  };
};



function emit(sourceFile: ts.SourceFile) {
  // console.log('./uni-rpc.yaml', config);
  ClearTargets(config);
  let lowerFilename = sourceFile.fileName.toLowerCase();

  if (lowerFilename.endsWith('.ts') && !lowerFilename.endsWith('.d.ts')) {
    global['SourceFileCount'] = global['SourceFileCount'] - 1;
    resolver.resolveSourceFile(sourceFile);
    if (global['SourceFileCount'] == 0) {
      console.log('builder.Children.size:', resolver.Children.size);
      let results: Namespace[] = [];
      for (let key of resolver.Children.keys()) {
        // console.log(JSON.stringify(builder.Children.get(key), null, 4));
        results.push(resolver.Children.get(key));
      }
      resolver.build(undefined);
      resolver.link();
      //  util.inspect(results, true, 12)
      
      WriteFile('./uni-rpc.json', JSON.stringify(results, getCircularReplacer(), 4));
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