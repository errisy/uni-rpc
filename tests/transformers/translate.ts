import * as ts from 'typescript';
import * as fs from 'fs';
import * as yaml from 'yaml';
import { Namespace, Service, Message, Property, Method, Type } from './definitions';
import { SyntaxKindMap } from './SyntaxKindMap';
import { SourceFileResovler } from './resolvers';
import {} from 'ts-expose-internals';
import { RPC, Target } from './rpc-configuration';
import * as CSharpWebsocketService from './csharp-websocket-service';
import * as TypeScriptWebsocketAngularClient from './typescript-websocket-angular-client';
import * as TypeScriptWebsocketLambdaService from './typescript-websocket-lambda-service';
import * as PythonWebsocketLambdaService from './python-websocket-lambda-service';

function readRPCConfig() {
  let data = fs.readFileSync('uni-rpc.yaml', 'utf-8');
  return yaml.parse(data) as RPC;
}

const config = readRPCConfig();
const resolver = new SourceFileResovler();

function emitFiles() {
  for(let target of config.rpc) {
    if (typeof target.cs == 'string') {
      let transpiler = new CSharpWebsocketService.Transpiler(resolver);
      transpiler.emit(target);
    } else if (typeof target.ts == 'string') {
      switch (target.type) {
        case 'websocket-angular-client': {
          let transpiler = new TypeScriptWebsocketAngularClient.Transpiler(resolver);
          transpiler.emit(target);
        } break;
        case 'websocket-lambda-service': {
          let transpiler = new TypeScriptWebsocketLambdaService.Transpiler(resolver);
          transpiler.emit(target);
        } break;
      }
    } else if(typeof target.py == 'string') {
      switch (target.type) {
        case 'websocket-lambda-service': {
          let transpiler = new PythonWebsocketLambdaService.Transpiler(resolver);
          transpiler.emit(target);
        } break;
        case 'lambda-service': {

        } break;
        case 'lambda-client': {

        } break;
      }
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
      console.log('groups:', resolver.Groups);
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