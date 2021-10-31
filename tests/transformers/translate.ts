import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { Namespace, Service, Message, Property, Method, Type } from './definitions';

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

function print(statement: ts.Statement | ts.Node) {
  console.log(`Statement: ${statement.kind}:\n${statement.getText()}`);
}

const TsKind = {
  Namespace: 259,
  Class: 255,
  Content: 343,
  Method: 167,
  Property: 165,
  MemberName: 79,
  MethodArgument: 343,
  MethodReturnType1: 132,
  MethodReturnType2: 148,
  MethodReturnType3: 176,
  PropertyType: 176
}

class Builder {
  namespaces: Namespace[] = [];
  constructor (private sourceFile: ts.SourceFile, private targets: Target[]) {
    for (let item of sourceFile.statements) {
      if (item.kind == TsKind.Namespace) {
        this.buildNamespace(item as any, []);
      }
    }
  }
  // DFS Backtracking
  buildNamespace(token: ts.NamespaceDeclaration, stack: string[], parent?: Namespace) {
    let ns = new Namespace();
    ns.Name = token.name.getText();;
    stack.push(ns.Name);
    for (let item of token.body.getChildren()) {
      if (item.kind == TsKind.Content) {
        for (let subitem of item.getChildren()) {
          switch (subitem.kind) {
            case TsKind.Namespace: {
              this.buildNamespace(subitem as any, stack, ns);
            } break;
            case TsKind.Class: {
              this.buildClass(subitem as any, stack, ns);
            } break;
          }
        }
      }
    }
    stack.pop();
    if (parent) {
      parent.Namespaces.push(ns);
    } else {
      this.namespaces.push(ns);
    }
  }

  buildClass(token: ts.ClassDeclaration, stack: string[], ns: Namespace) {
    let name = token.name.getText();
    console.log(`**** Class ${name} Begin`);
    let isAbstract: boolean = false;
    if (token.modifiers) {
      for (let modifier of token.modifiers) {
        if (modifier.getText() == 'abstract') {
          isAbstract = true;
          break;
        }
      }
    }
    if (isAbstract) {
      let service = new Service();
      service.Name = name;
      for (let item of token.getChildren()) {
        if (item.kind == TsKind.Content) {
          for (let subitem of item.getChildren()) {
            switch (subitem.kind) {
              case TsKind.Method: {
                this.buildMethod(subitem as any, stack, service);
              } break;
            }
          }
        }
      }
      ns.Services.push(service);
    } else {
      let message = new Message();
      message.Name = name;
      for (let item of token.getChildren()) {
        if (item.kind == TsKind.Content) {
          for (let subitem of item.getChildren()) {
            switch (subitem.kind) {
              case TsKind.Property: {
                this.buildProperty(subitem as any, stack, message);
              } break;
            }
          }
        }
      }
      ns.Messages.push(message);
    }
   
    console.log(`**** Class ${name} End`);
  }

  buildMethod(token: ts.MethodDeclaration, stack: string[], service: Service) {
    let name = token.name.getText();
    console.log(`**** Method ${name} Begin`);
    let method = new Method();
    method.Name = name;
    for (let item of token.getChildren()) {
      print(item);
    }
    console.log(`**** Method ${name} End`);
    service.Methods.push(method);
  }

  buildProperty(token: ts.PropertyLikeDeclaration, stack: string[], message: Message) {
    let name = token.name.getText();
    let property = new Property();
    property.Name = name;
    console.log(`**** Property ${name} Begin`);
    for (let item of token.getChildren()) {
      if (item.kind == TsKind.PropertyType) {
        property.Type = this.resolveType(item as any, stack);
      }
      print(item);
    }
    console.log(`**** Property ${name} End`);
    message.Properties.push(property);
  }
  resolveType(token: ts.TypeNode, stack: string[]): Type {
    let t = new Type();
    t.Name = token.getText();
    return t;
  }
}
 

function emit(sourceFile: ts.SourceFile) {
  console.log('./uni-rpc.yaml', config);
  ClearTargets(config);
  if(sourceFile.fileName.toLowerCase().endsWith('.ts')) {
    let builder = new Builder(sourceFile, config.rpc);
    console.log(JSON.stringify(builder.namespaces, null, 4));
    let output = sourceFile.fileName.replace(/.ts$/ig, '.json');
    WriteFile(output, JSON.stringify(builder.namespaces, null, 4));
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