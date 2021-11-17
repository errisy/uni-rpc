import {ILocalNameResolver, Namespace, Service, Message, Method, Parameter as Parameter, Property, Type,
    BooleanType, StringType, FloatType, DoubleType, IntegerType, LongType, BytesType, ListType, DictType, ArrayType, VoidType, ServiceInterface, MessageInterface, PromiseType} from './definitions';
import * as ts from 'typescript';
import { SyntaxKindMap } from './SyntaxKindMap';

export class SourceFileResovler implements ILocalNameResolver {
    NamespaceStack: Namespace[] = [];
    Children: Map<string, Namespace> = new Map();
    Parent: ILocalNameResolver; // This will not be set, because this is the root node of the tree.
    PredefinedTypes: Map<string, Type> = new Map();
    private currentSourceFilename: string;
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
        this.PredefinedTypes.set('Promise', PromiseType);
    }

    resolve(fullname: string[]): Type {
        if (fullname.length == 1 && this.PredefinedTypes.has(fullname[0])) {
            return this.PredefinedTypes.get(fullname[0]);
        } else if (fullname.length > 1 && this.Children.has(fullname.slice(0, fullname.length - 1).join('.'))) {
            let resolved: Type | undefined;
            if (resolved = this.Children.get(
                    fullname.slice(0, fullname.length - 1).join('.')).topdownResolve(fullname.slice(1))
                    ) {
                return resolved;
            }
        }
        console.trace(`Unresolved Type "${fullname.join('.')}."`);
        throw `Unresolved Type "${fullname.join('.')}."`;
    }

    build(parent: ILocalNameResolver): void {
        for (let child of this.Children.values()) {
            // Only build the top level namespaces
            if (child.Fullname.length == 1){
                child.build(this);
            }
        }
    }

    link(): void {
        for (let child of this.Children.values()) {
            child.link();
        }
    }

    resolveSourceFile(sourceFile: ts.SourceFile) {
        this.currentSourceFilename = sourceFile.fileName;
        for (let child of sourceFile.statements) {
            switch (child.kind) {
                case ts.SyntaxKind.ModuleDeclaration: {
                    this.resolveModule(child as any);
                } break;
            }
        }
        this.currentSourceFilename = undefined;
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
                            case ts.SyntaxKind.InterfaceDeclaration: {
                                this.resolveInterface(child as any);
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
            if (token.heritageClauses) {
                service.Base = resolveBaseType(token.heritageClauses);
                service.Implementations = resolveInterfaces(token.heritageClauses);
            }
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
            let serviceType = new Type(name);
            serviceType.FullName = [...this.NamespaceStack.map(ns => ns.Name), name];
            serviceType.ServiceReference = service;
            serviceType.ReferenceType = 'Service';
            service.Type = serviceType;
        } else {
            let message: Message = this.currentNamespace.addMessage(nsName, name);
            if (token.heritageClauses) {
                message.Base = resolveBaseType(token.heritageClauses);
                message.Implementations = resolveInterfaces(token.heritageClauses);
            }
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
            messageType.MessageReference = message;
            messageType.ReferenceType = 'Message';
            message.Type = messageType;
        }
    }

    private resolveInterface(token: ts.InterfaceDeclaration) {
        let name = resolveName(token.name as any);
        let nsName = this.buildCurrentNamespaceFullname();
        if (!name.startsWith('I')) {
            throw `Interface name of "${token.name}" in File "${this.currentSourceFilename}" does not start with "I".`;
        }
        if (name.endsWith('Service')) {
            let serviceInterface = this.currentNamespace.addServiceInterface(nsName, name);
            if (token.heritageClauses) {
                serviceInterface.Base = resolveBaseType(token.heritageClauses);
            }
            if (token.typeParameters) {
                serviceInterface.IsGeneric = true;
                for (let typeParameter of token.typeParameters) {
                    serviceInterface.GenericArguments.push(resolveTypeParameter(typeParameter));
                }
            }
            for (let item of token.members) {
                switch (item.kind) {
                    case ts.SyntaxKind.MethodSignature: {
                        serviceInterface.Methods.push(resolveMethod(item as any));
                    } break;
                    default: {
                        console.log(`Interface Method ${item.name}:`, SyntaxKindMap[item.kind]);
                    } break; 
                }
            }
            let serviceType = new Type(name);
            serviceType.FullName =  [...this.NamespaceStack.map(ns => ns.Name), name];
            serviceType.ServiceInterfaceReference = serviceInterface;
            serviceType.ReferenceType = 'ServiceInterface';
            serviceInterface.Type = serviceType;
        } else if (name.endsWith('Message')) {
            let messageInterface = this.currentNamespace.addMessageInterface(nsName, name);
            if (token.heritageClauses) {
                messageInterface.Base = resolveBaseType(token.heritageClauses);
            }
            if (token.typeParameters) {
                messageInterface.IsGeneric = true;
                for (let typeParameter of token.typeParameters) {
                    messageInterface.GenericArguments.push(resolveTypeParameter(typeParameter));
                }
            }
            for (let item of token.members) {
                switch (item.kind) {
                    case ts.SyntaxKind.PropertySignature: {
                        messageInterface.Properties.push(resolveProperty(item as any));
                    } break;
                    default: {
                        console.log(`Interface Method ${item.name}:`, SyntaxKindMap[item.kind]);
                    } break; 
                }
            }
            let messageType = new Type(name);
            messageType.FullName = [...this.NamespaceStack.map(ns => ns.Name), name];
            messageType.MessageInterfaceReference = messageInterface;
            messageType.ReferenceType = 'MessageInterface';
            messageInterface.Type = messageType;
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

function resolveBaseType(clauses: ts.NodeArray<ts.HeritageClause>): Type {
    for (let clause of clauses) {
        if (clause.token == ts.SyntaxKind.ExtendsKeyword) {
            let t = resolveExpressionWithTypeArguments(clause.types[0]);
            return t;
        }
    }
    return undefined;
}

function resolveInterfaces(clauses: ts.NodeArray<ts.HeritageClause>): Type[] {
    let types: Type[] = [];
    for (let clause of clauses) {
        if (clause.token == ts.SyntaxKind.ImplementsKeyword) {
            for (let type of clause.types) {
                let interfaceType = resolveExpressionWithTypeArguments(type);
                types.push(interfaceType);
            }
        }
    }
    return types
}

function resolveParameters(parameterArray: ts.NodeArray<ts.ParameterDeclaration>): Parameter[] {
    let parameters: Parameter[] = [];
    for (let item of parameterArray) {
        parameters.push(resolveParameter(item as any));
    }
    return parameters;
}

function resolveExpressionWithTypeArguments(token: ts.ExpressionWithTypeArguments) {
    let referenceType: Type = new Type();
    if (Array.isArray(token.typeArguments) && token.typeArguments.length > 0) {
        referenceType.IsGeneric = true;
        let genericDefinition: Type = new Type();
        genericDefinition.FullName = resolvePropertyAccessExpression(token.expression as any);
        genericDefinition.Name = genericDefinition.FullName[genericDefinition.FullName.length - 1];
        genericDefinition.IsGenericDefinition = true;
        referenceType.FullName = [...genericDefinition.FullName];
        referenceType.Name = genericDefinition.Name;
        referenceType.GenericDefinition = genericDefinition;
        referenceType.GenericArguments = token.typeArguments.map(typeParameter => resolveType(typeParameter));
    } else {
        referenceType.FullName = resolvePropertyAccessExpression(token.expression as any);
        referenceType.Name = referenceType.FullName[referenceType.FullName.length - 1];
    }
    return referenceType;
}

function resolvePropertyAccessExpression(token: ts.PropertyAccessExpression | ts.Identifier): string[] {
    if (token.kind == ts.SyntaxKind.Identifier) {
        let identifier = token as ts.Identifier;
        let name = resolveIdentifier(identifier as any);
        return [name];
    } else if (token.kind == ts.SyntaxKind.PropertyAccessExpression) {
        let propertyAccessExpression = token as ts.PropertyAccessExpression;
        if(propertyAccessExpression.expression.kind == ts.SyntaxKind.PropertyAccessExpression) {
            let parentNames = resolvePropertyAccessExpression(propertyAccessExpression.expression as any);
            let name = resolveIdentifier(propertyAccessExpression.name as any);
            return [...parentNames, name];
        } else if (propertyAccessExpression.expression.kind == ts.SyntaxKind.Identifier) {
            let parentName = resolveIdentifier(propertyAccessExpression.expression as any);
            let name = resolveIdentifier(propertyAccessExpression.name as any);
            return [parentName, name];
        }
    }
    throw `token.kind: ${SyntaxKindMap[token.kind]}`;
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
        case ts.SyntaxKind.VoidKeyword: {
            return VoidType;
        }
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
          referenceType.Name = referenceType.FullName[referenceType.FullName.length - 1];
        } break;
        case ts.SyntaxKind.LessThanToken: {
          referenceType.IsGeneric = true;
          let genericDefinition = new Type();
          genericDefinition.Name = referenceType.Name;
          genericDefinition.FullName = referenceType.FullName;
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