import {Namespace, Service, Message, Method, Parameter as Parameter, Property, Type, BooleanType, StringType, FloatType, DoubleType, IntegerType, LongType, ListType, DictType, ArrayType} from './definitions';
import * as ts from 'typescript';
import { SyntaxKindMap } from './SyntaxKindMap';

export class SourceFileResovler {
    NamespaceStack: Namespace[] = [];
    Children: Map<string, Namespace> = new Map();
    constructor() {
    }

    resolveSourceFile(sourceFile: ts.SourceFile) {
        for (let child of sourceFile.statements) {
            // console.log('resolveSourceFile:', SyntaxKindMap[child.kind]);
            switch (child.kind) {
                case ts.SyntaxKind.ModuleDeclaration: {
                    this.resolveModule(child as any);
                } break;
            }
        }
    }

    private buildCurrentNamespaceFullname(name?: string): string[] {
        if (typeof name == 'string') {
            if (this.NamespaceStack.length == 0) return [name];
            return [...this.NamespaceStack[this.NamespaceStack.length - 1].Fullname, name];
        } else {
            if (this.NamespaceStack.length == 0) return [];
            return [...this.NamespaceStack[this.NamespaceStack.length - 1].Fullname];
        }
    }

    private getNamespace(fullname: string[]): Namespace {
        let nsName = fullname.join('.');
        if (this.Children.has(nsName)) {
            return this.Children.get(nsName);
        } else {
            let nsInstance = new Namespace();
            nsInstance.Name = fullname[fullname.length - 1];
            nsInstance.Fullname = fullname;
            this.Children.set(nsName, nsInstance);
            return nsInstance;
        }
    }

    /** get the last name space in the stack */
    private get currentNamespace(): Namespace {
        return this.NamespaceStack[this.NamespaceStack.length - 1];
    }

    private resolveModule(token: ts.ModuleDeclaration) {
        let name = resolveName(token.name as any);
        let nsName = this.buildCurrentNamespaceFullname(name);
        let nsInstance: Namespace = this.getNamespace(nsName);
        this.NamespaceStack.push(nsInstance);
        if (token.body) {
            for (let component of token.body.getChildren()) {
                if (component.kind == ts.SyntaxKind.SyntaxList) {
                    for (let child of component.getChildren()) {
                        // console.log('resolveModule:', SyntaxKindMap[child.kind]);
                        switch (child.kind) {
                            case ts.SyntaxKind.ModuleDeclaration: {
                                this.resolveModule(child as any);
                            } break;
                            case ts.SyntaxKind.ClassDeclaration: {
                                this.resolveClass(child as any);
                            } break;
                        }
                    }
                    break;
                }
            }
        }
        this.NamespaceStack.pop();
    }

    private resolveClass(token: ts.ClassDeclaration) {
        let name = resolveName(token.name as any);
        let nsName = this.buildCurrentNamespaceFullname();
        if (isAbstractClass(token)) {
            let service: Service = this.currentNamespace.addService(nsName, name);
            if (token.typeParameters) {
                service.IsGeneric = true;
                for (let typeParameter of token.typeParameters) {
                    service.GenericArguments.push(resolveTypeParameter(typeParameter));
                }
            }
            for (let item of token.members) {
                switch (item.kind) {
                    case ts.SyntaxKind.MethodDeclaration: {
                        service.Methods.push(resolveMethod(item as any));
                    } break;
                }
            }
        } else {
            let message: Message = this.currentNamespace.addMessage(nsName, name);
            if (token.typeParameters) {
                message.IsGeneric = true;
                for (let typeParameter of token.typeParameters) {
                    message.GenericArguments.push(resolveTypeParameter(typeParameter));
                }
            }
            for (let item of token.members) {
                switch (item.kind) {
                    case ts.SyntaxKind.PropertyDeclaration: {
                        message.Properties.push(resolveProperty(item as any));
                    } break;
                }
            }
            let messageType = new Type(name);
            messageType.FullName = [...this.NamespaceStack.map(ns => ns.Name), name];
        }
    }
}

function resolveMethod(token: ts.MethodDeclaration): Method {
    let name = resolveName(token.name as any);
    let method = new Method();
    method.Name = name;
    if (token.typeParameters) {
        method.IsGeneric = true;
        for (let typeParameter of token.typeParameters) {
            method.GenericArguments.push(resolveTypeParameter(typeParameter));
        }
    }
    method.Parameters = resolveParameters(token.parameters as any);
    method.ReturnType = resolveType(token.type as any); 
    return method;
}

function resolveParameters(parameterArray: ts.NodeArray<ts.ParameterDeclaration>): Parameter[] {
    let parameters: Parameter[] = [];
    for (let item of parameterArray) {
        parameters.push(resolveParameter(item as any));
    }
    return parameters;
}

function resolveParameter(token: ts.ParameterDeclaration): Parameter {
    let parameter: Parameter = new Parameter();
    parameter.Name = resolveName(token.name);
    parameter.Type = resolveType(token.type);
    return parameter;
}

function resolveProperty(token: ts.PropertyDeclaration): Property {
    let name = resolveName(token.name as any);
    let stage: number = 0;
    let property = new Property();
    property.Name = name;
    for (let item of token.getChildren()) {
        switch (stage) {
            case 0: {
                switch (item.kind) {
                    case ts.SyntaxKind.ColonToken: {
                        ++stage; // 0 -> 1
                    } break;
                }
            } break;
            case 1: {
                switch (item.kind) {
                    case ts.SyntaxKind.ColonToken: 
                    case ts.SyntaxKind.SemicolonToken:
                        break;
                    default: {
                        property.Type = resolveType(item);
                        ++stage; // 1 -> 2
                    } break;
                }
            } break;
        }
    }
    return property;
}

function resolveType(token: ts.Node): Type {
    switch (token.kind) {
        case ts.SyntaxKind.BooleanKeyword: {
            return BooleanType;
        } break;
        case ts.SyntaxKind.StringKeyword: {
            return StringType;
        } break;
        case ts.SyntaxKind.NumberKeyword: {
            return FloatType;
        } break;
        case ts.SyntaxKind.TypeReference: {
            return resolveTypeReference(token as any);
        } break;
        case ts.SyntaxKind.ArrayType: {
            return resolveArrayType(token as any);
        } break;
        default: {
            throw `resolveType: Unexpected token kind ${SyntaxKindMap[token.kind]} => '${token.getFullText()}'`;
        } break;
    }
}

function resolveArrayType(token: ts.ArrayTypeNode): Type {
    let typeInstance = new Type('Array');
    typeInstance.IsGeneric = true;
    typeInstance.GenericDefinition = ArrayType;
    typeInstance.GenericArguments = [resolveType(token.elementType)];
    return typeInstance;
}

function resolveTypeReference(token: ts.TypeNode): Type {
    let t = new Type();
    for (let item of token.getChildren()) {
      switch (item.kind) {
        case ts.SyntaxKind.Identifier: {
          t.Name = resolveIdentifier(item as any);
          t.FullName = [t.Name];
        } break;
        case ts.SyntaxKind.QualifiedName: {
          t.FullName = resolveQualifiedName(item as any);
        } break;
        case ts.SyntaxKind.LessThanToken: {
          t.IsGeneric = true;
        } break;
        case ts.SyntaxKind.SyntaxList: {
          t.GenericArguments = resolveGenericArguments(item as any);
        } break;
      }
    }
    return t;
} 

function resolveTypeParameter(token: ts.TypeParameterDeclaration): Type {
    let name = token.name.text;
    let genericePlacerholder = new Type(name);
    genericePlacerholder.IsGenericPlaceholder = true;
    return genericePlacerholder;
}

function resolveGenericArguments(token: ts.SyntaxList): Type[] {
    let types: Type[] = [];
    for (let item of token.getChildren()) {
    //   console.log('resolveGenericArguments:', SyntaxKindMap[item.kind], item.getFullText());
      switch (item.kind) {
        case ts.SyntaxKind.CommaToken: 
            break;
        default: {
            types.push(resolveType(item as any));
        } break;
      }
    }
    return types;
}

function resolveQualifiedName(token: ts.QualifiedName): string[] {
    let results: string[] = [];
    switch (token.left.kind) {
      case ts.SyntaxKind.QualifiedName: {
        results.push(...resolveQualifiedName(token.left as any));
      } break;
      case ts.SyntaxKind.Identifier: {
        results.push(resolveIdentifier(token.left as any));
      } break;
    }
    switch (token.right.kind) {
      case ts.SyntaxKind.Identifier: {
        results.push(resolveIdentifier(token.right as any));
      } break;
    }
    return results;
}

function resolveIdentifier(token: ts.Identifier): string {
    return token.text;
}

function isAbstractClass(token: ts.ClassDeclaration) {
    if (token.modifiers) {
        for (let modifier of token.modifiers) {
            if (modifier.getText() == 'abstract') {
                return true;
            }
        }
    }
    return false;
}

function resolveName(name: ts.BindingName): string {
    for (let child of name.getChildren()) {
        console.log('resolveName:', child.getFullText(), SyntaxKindMap[child.kind])
    }
    return name.getText();
}