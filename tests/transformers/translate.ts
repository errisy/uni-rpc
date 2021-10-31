import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

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
  MethodReturnType: 176,
  PropertyType: 148
}

class Builder {
  constructor (private sourceFile: ts.SourceFile, private targets: Target[]) {
    for (let item of sourceFile.statements) {
      if (item.kind == TsKind.Namespace) {
        this.buildNamespace(item as any, []);
      }
    }
  }
  
  buildNamespace(token: ts.NamespaceDeclaration, stack: string[]) {
    let name = token.name.getText();
    stack.push(name);
    for (let item of token.body.getChildren()) {
      if (item.kind == TsKind.Content) {
        for (let subitem of item.getChildren()) {
          if (subitem.kind == TsKind.Class) {
            this.buildClass(subitem as any, stack)
          }
        }
      }
    }
    stack.pop();
  }

  buildClass(token: ts.ClassDeclaration, stack: string[]) {
    let name = token.name.getText();
    console.log(`**** Class ${name} Begin`);
    if (token.modifiers) {
      token.modifiers.forEach(item => {
        console.log('modifier:', item.getText());
      })
    }
    for (let item of token.getChildren()) {
      if (item.kind == TsKind.Content) {
        for (let subitem of item.getChildren()) {
          switch (subitem.kind) {
            case TsKind.Method: {
              this.buildMethod(subitem as any, stack);
            } break;
            case TsKind.Property: {
              this.buildProperty(subitem as any, stack);
            } break;
          }
        }
      }
    }
    console.log(`**** Class ${name} End`);
  }

  buildMethod(token: ts.MethodDeclaration, stack: string[]) {
    let name = token.name.getText();
    console.log(`**** Method ${name} Begin`);
    for (let item of token.getChildren()) {
      print(item);
    }
    console.log(`**** Method ${name} End`);
  }

  buildProperty(token: ts.PropertyLikeDeclaration, stack: string[]) {
    let name = token.name.getText();
    console.log(`**** Property ${name} Begin`);
    for (let item of token.getChildren()) {
      print(item);
    }
    console.log(`**** Property ${name} End`);
  }
}

function emit(sourceFile: ts.SourceFile) {
  console.log('./uni-rpc.yaml', config);
  ClearTargets(config);
  if(sourceFile.fileName.toLowerCase().endsWith('.ts')) {
    new Builder(sourceFile, config.rpc);
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