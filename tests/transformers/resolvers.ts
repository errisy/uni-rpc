import {Namespace, Service, Message, Method, Argument, Property, Type, BooleanType, StringType, FloatType, DoubleType, IntegerType, LongType, ListType, DictType, ArrayType} from './definitions';
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

    private buildCurrentNamespaceFullname(name?: string) {
        if (typeof name == 'string') {
            return this.NamespaceStack.map(ns => ns.Name).join('.') + '.' + name;
        } else {
            return this.NamespaceStack.map(ns => ns.Name).join('.');
        }
    }

    private getNamespace(nsName: string): Namespace {
        if (this.Children.has(nsName)) {
            return this.Children.get(nsName);
        } else {
            let nsInstance = new Namespace();
            nsInstance.Name = nsName;
            this.Children.set(nsName, nsInstance);
            return nsInstance;
        }
    }

    /** get the last name space in the stack */
    private get currentNamespace(): Namespace {
        return this.NamespaceStack[this.NamespaceStack.length - 1];
    }

    private resolveModule(token: ts.ModuleDeclaration) {
        let name = token.name.getFullText();
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
        let name = token.name.getFullText();
        let nsName = this.buildCurrentNamespaceFullname();
        if (isAbstractClass(token)) {
            let service: Service = this.currentNamespace.addService(nsName, name);
            for (let item of token.members) {
                switch (item.kind) {
                    case ts.SyntaxKind.MethodDeclaration: {
                        service.Methods.push(this.resolveMethod(item as any));
                    } break;
                }
            }
        } else {
            let message: Message = this.currentNamespace.addMessage(nsName, name);
            for (let item of token.members) {
                switch (item.kind) {
                    case ts.SyntaxKind.PropertyDeclaration: {
                        message.Properties.push(this.resolveProperty(item as any));
                    } break;
                }
            }
        }
    }

    private resolveMethod(token: ts.MethodDeclaration): Method {
        let name = token.name.getFullText();
        let stage: number = 0;
        let method = new Method();
        method.Name = name;
        for (let item of token.getChildren()) {
            switch (stage) {
                case 0: case 1: case 2: case 3:{
                    switch (item.kind) {
                        case ts.SyntaxKind.OpenParenToken: {
                            ++stage; // 0 -> 1
                        } break;
                        case ts.SyntaxKind.SyntaxList: {
                            ++stage; // 1 -> 2
                        } break;
                        case ts.SyntaxKind.CloseParenToken: {
                            ++stage; // 2 -> 3
                        } break;
                        case ts.SyntaxKind.ColonToken: {
                            ++stage; // 3 -> 4;
                        }
                    }
                } break;
                case 4: {
                    switch (item.kind) {
                        case ts.SyntaxKind.SemicolonToken:
                        case ts.SyntaxKind.ColonToken:
                            break;
                        default: {
                            method.ReturnType = this.resolveType(item as any); 
                        } break;
                    }
                } break;
            }
        }
        return method;
    }

    private resolveArguments(token: ts.SyntaxList): Argument[] {
        let parameters: Argument[] = [];
        for (let item of token.getChildren()) {
            console.log('resolveArguments:', item.getFullText(), SyntaxKindMap[item.kind]);
        }
        return parameters;
    }

    private resolveProperty(token: ts.PropertyDeclaration): Property {
        let name = token.name.getFullText();
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
                            property.Type = this.resolveType(item);
                            ++stage; // 1 -> 2
                        } break;
                    }
                } break;
            }
        }
        return property;
    }

    private resolveType(token: ts.Node): Type {
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
                return this.resolveTypeReference(token as any);
            } break;
            case ts.SyntaxKind.ArrayType: {
                return this.resolveArrayType(token as any);
            } break;
            default: {
                throw `resolveType: Unexpected token kind ${SyntaxKindMap[token.kind]} => '${token.getFullText()}'`;
            } break;
        }
    }

    private resolveArrayType(token: ts.ArrayTypeNode): Type {
        let typeInstance = new Type('Array');
        typeInstance.IsGeneric = true;
        typeInstance.GenericDefinition = ArrayType;
        typeInstance.GenericArguments = [this.resolveType(token.elementType)];
        return typeInstance;
    }

    private resolveTypeReference(token: ts.TypeNode): Type {
        let t = new Type();
        for (let item of token.getChildren()) {
          // console.log('TypeNode Child:', SyntaxKindMap[item.kind], item.getFullText());
          switch (item.kind) {
            case ts.SyntaxKind.Identifier: {
              t.Name = this.resolveIdentifier(item as any);
              t.FullName = [t.Name];
            } break;
            case ts.SyntaxKind.QualifiedName: {
              t.FullName = this.resolveQualifiedName(item as any);
            } break;
            case ts.SyntaxKind.LessThanToken: {
              t.IsGeneric = true;
            } break;
            case ts.SyntaxKind.SyntaxList: {
              t.GenericArguments = this.resolveGenericArguments(item as any);
            } break;
          }
        }
        // console.log('*** Stop to iterate TypeReference:');
        return t;
    }

    private resolveGenericArguments(token: ts.SyntaxList): Type[] {
        let types: Type[] = [];
        for (let item of token.getChildren()) {
        //   console.log('resolveGenericArguments:', SyntaxKindMap[item.kind], item.getFullText());
          switch (item.kind) {
            case ts.SyntaxKind.CommaToken: 
                break;
            default: {
                types.push(this.resolveType(item as any));
            } break;
          }
        }
        return types;
      }

      resolveQualifiedName(token: ts.QualifiedName): string[] {
        let results: string[] = [];
        switch (token.left.kind) {
          case ts.SyntaxKind.QualifiedName: {
            results.push(...this.resolveQualifiedName(token.left as any));
          } break;
          case ts.SyntaxKind.Identifier: {
            results.push(this.resolveIdentifier(token.left as any));
          } break;
        }
        switch (token.right.kind) {
          case ts.SyntaxKind.Identifier: {
            results.push(this.resolveIdentifier(token.right as any));
          } break;
        }
        return results;
      }
    
      private resolveIdentifier(token: ts.Identifier): string {
        return token.text;
      }
}

export function isAbstractClass(token: ts.ClassDeclaration) {
    if (token.modifiers) {
        for (let modifier of token.modifiers) {
            if (modifier.getText() == 'abstract') {
                return true;
            }
        }
    }
    return false;
}