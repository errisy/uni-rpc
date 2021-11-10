import {ILocalNameResolver, Namespace, Service, Message, Method, Parameter as Parameter, Property, Type,
    BooleanType, StringType, FloatType, DoubleType, IntegerType, LongType, BytesType, ListType, DictType, ArrayType, VoidType} from './definitions';
import * as ts from 'typescript';
import { SyntaxKindMap } from './SyntaxKindMap';

export class SourceFileResovler implements ILocalNameResolver {
    NamespaceStack: Namespace[] = [];
    Children: Map<string, Namespace> = new Map();
    Parent: ILocalNameResolver; // This will not be set, because this is the root node of the tree.
    PredefinedTypes: Map<string, Type> = new Map();
    constructor() {
        this.PredefinedTypes.set('boolean', BooleanType);
        this.PredefinedTypes.set('string', StringType);
        this.PredefinedTypes.set('float', FloatType);
        this.PredefinedTypes.set('double', DoubleType);
        this.PredefinedTypes.set('integer', IntegerType);
        this.PredefinedTypes.set('long', LongType);
        this.PredefinedTypes.set('bytes', BytesType);
        this.PredefinedTypes.set('List', ListType);
        this.PredefinedTypes.set('Dict', DictType);
        this.PredefinedTypes.set('Array', ArrayType);
        this.PredefinedTypes.set('void', VoidType);
    }

    resolve(fullname: string[]): Type {
        if (fullname.length == 1 && this.PredefinedTypes.has(fullname[0])) {
            return this.PredefinedTypes.get(fullname[0]);
        } else if (fullname.length > 1 && this.Children.has(fullname.slice(0,fullname.length - 1).join('.'))) {
            let resolved: Type | undefined;
            if (resolved = this.Children.get(
                    fullname.slice(0,fullname.length - 1).join('.')).topdownResolve(fullname.slice(1)
                )) {
                return resolved;
            }
        }
        console.trace(`Unresolved Type "${fullname.join('.')}."`);
        throw `Unresolved Type "${fullname.join('.')}."`;
    }

    build(parent: ILocalNameResolver): void {
        for (let child of this.Children.values()) {
            child.build(this);
        }
    }

    link(): void {
        for (let child of this.Children.values()) {
            child.link();
        }
    }

    resolveSourceFile(sourceFile: ts.SourceFile) {
        for (let child of sourceFile.statements) {
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
            if (this.currentNamespace) {
                this.currentNamespace.Namespaces.set(nsName, nsInstance);
            }
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
    typeInstance.FullName = ['Array'];
    typeInstance.GenericDefinition = ArrayType;
    typeInstance.GenericArguments = [resolveType(token.elementType)];
    return typeInstance;
}

function resolveTypeReference(token: ts.TypeNode): Type {
    let referenceType = new Type();
    for (let item of token.getChildren()) {
      switch (item.kind) {
        case ts.SyntaxKind.Identifier: {
          referenceType.Name = resolveIdentifier(item as any);
          referenceType.FullName = [referenceType.Name];
        } break;
        case ts.SyntaxKind.QualifiedName: {
          referenceType.FullName = resolveQualifiedName(item as any);
        } break;
        case ts.SyntaxKind.LessThanToken: {
          referenceType.IsGeneric = true;
          let genericDefinition = new Type();
          genericDefinition.Name = resolveIdentifier(item as any);
          genericDefinition.FullName = [referenceType.Name];
          genericDefinition.IsGenericDefinition = true;
          referenceType.GenericDefinition = genericDefinition;
        } break;
        case ts.SyntaxKind.SyntaxList: {
          referenceType.GenericArguments = resolveGenericArguments(item as any);
        } break;
      }
    }
    return referenceType;
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