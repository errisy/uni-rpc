import * as ts from 'typescript';
import * as fs from 'fs';
import * as yaml from 'yaml';
import { Namespace, Service, Message, Property, Method, Type } from './definitions';
import { SyntaxKindMap } from './SyntaxKindMap';
import { SourceFileResovler } from './resolvers';
import {} from 'ts-expose-internals';
import { RPC, Target } from './rpc-configuration';
import { CSharpBuilder } from './csharp';

function readRPCConfig() {
  let data = fs.readFileSync('uni-rpc.yaml', 'utf-8');
  return yaml.parse(data) as RPC;
}

const config = readRPCConfig();
const resolver = new SourceFileResovler();

function emitFiles() {
  for(let target of config.rpc) {
    if (typeof target.cs == 'string') {
      let csharp = new CSharpBuilder(resolver);
      csharp.emit(target);
    }
  }
}

function translate(sourceFile: ts.SourceFile) {
  // console.log('./uni-rpc.yaml', config);
  
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
      
      // WriteFile('./uni-rpc.json', JSON.stringify(results, getCircularReplacer(), 4));
      emitFiles();
    }
  }

  return sourceFile;
}

const transformer: ts.TransformerFactory<ts.SourceFile> = () => {
    return sourceFile => {
      return ts.factory.updateSourceFile(translate(sourceFile), [
        ...sourceFile.statements,
      ]);
    };
  };
  
export default transformer;