import { Namespace, Service, Message, Method, Property, Parameter, Type, VoidType, ServiceInterface, MessageInterface, StringType } from './definitions';
import { SourceFileResovler } from './resolvers';
import { RPC, Target } from './rpc-configuration';
import { CodeBuilder } from './code-builder';
import { CopyDirectory, MakeDirectories, Remove, ResolvePath, WriteFile } from './os-utilities';
import * as path from 'path';
import { GroupAuthorization, GroupManagement } from 'group-management';

export class Transpiler {
    constructor (private resolver: SourceFileResovler) {
    }
    public emit(target: Target) {
        if (typeof target.py == 'string' && target.type == 'websocket-lambda-service') {
            let rootDirectory = ResolvePath(target.py);
            this.copyBaseFiles(rootDirectory);
            for (let instance of this.resolver.Children.values()) {
                if (instance.Fullname.length == 1) {
                    let topLevelNamespacePath = path.join(rootDirectory, instance.Name);
                    Remove(topLevelNamespacePath);
                    CodeGeneration.AsEmitter(instance).emitFiles(rootDirectory);
                }
            }
            if (this.resolver.Groups && this.resolver.Groups.size > 0) {
                let groups = new CodeGeneration.GroupAuthorizationsEmitter(this.resolver.Groups);
                groups.emitFile(rootDirectory);
            }
        }
    }
    private copyBaseFiles(rootDirectory: string) {
        let destination = path.normalize(path.join(rootDirectory, 'UniRpc'));
        console.log('Remove:', destination);
        Remove(destination);
        MakeDirectories(destination);
        CopyDirectory('./transformers/python/websocket-lambda-service', destination);
    }
}

module CodeGeneration {
    const TypeMappings: Map<string, string> = new Map<string, string>();
    TypeMappings.set('boolean', 'bool');
    TypeMappings.set('string', 'str');
    TypeMappings.set('float', 'float');
    TypeMappings.set('double', 'float');
    TypeMappings.set('integer', 'int');
    TypeMappings.set('long', 'int');
    TypeMappings.set('bytes', 'bytes');
    TypeMappings.set('void', 'None');
    TypeMappings.set('Promise', 'Coroutine');

    function importPath(consumer: string[], source: string[]): string | undefined {
        return source.join('.');
    }

    function fullnameAlias(fullname: string[]): string {
        return 'ImportedRef__' + fullname.join('_');
    }

    function genericMethodTypeAlias(methodName: string, typeName: string) {
        return `Method_TypeArg__${methodName}__${typeName}`;
    }

    function DeclareType(...fullname: string[]) {
        let declaredMessageType = new Type(fullname[fullname.length - 1]);
        declaredMessageType.FullName = [...fullname];
        declaredMessageType.ServiceReference = new Service();
        declaredMessageType.ServiceReference.Name = fullname[fullname.length - 1];
        declaredMessageType.ServiceReference.Fullname = declaredMessageType.FullName;
        declaredMessageType.Reference = declaredMessageType;
        return declaredMessageType;
    }


    const websocketServiceType = DeclareType('UniRpc', 'WebsocketService');
    const websocketServiceBaseType = DeclareType('UniRpc', 'WebsocketServiceBase');
    const baseMessageType = DeclareType('UniRpc', 'BaseMessage');
    const returnMessageType = DeclareType('UniRpc', 'ReturnMessage');
    
    function isSelfReference(typeInstance: Type, fullnameB: string[]) {
        if (!typeInstance.Reference) return false;
        let fullnameA: string[] = typeInstance.Reference.FullName;
        if (fullnameA.length != fullnameB.length) return false;
        let length = fullnameA.length;
        for (let i = 0; i < length; ++i) {
            if (fullnameA[i] != fullnameB[i]) return false;
        }
        return true;
    }
    export function mapType(typeInstance: Type, builder: CodeBuilder, fullname: string[], method?: Method): string {
        if (isSelfReference(typeInstance, fullname)) return typeInstance.Reference.Name;
        if (typeInstance.IsGenericPlaceholder) {
            if (typeInstance.Reference && method && typeInstance.Reference.Parent === method) {
                return genericMethodTypeAlias(method.Name, typeInstance.Name);
            }
            return typeInstance.Name;
        } else if (typeInstance.IsGeneric) {
            if (typeInstance.GenericDefinition.Reference.SystemType &&
                ['Array', 'List'].includes(typeInstance.GenericDefinition.Reference.SystemType)) {
                // This is the special case for array.
                builder.addHierarchicalImport('typing', 'List');
                let arrayType = typeInstance.GenericArguments[0];
                return `List[${mapType(arrayType, builder, fullname, method)}]`;
            } else if(typeInstance.GenericDefinition.Reference.SystemType &&
                ['Dict'].includes(typeInstance.GenericDefinition.Reference.SystemType)) {
                builder.addHierarchicalImport('typing', 'Dict');
                let keyType = typeInstance.GenericArguments[0];
                let valueType = typeInstance.GenericArguments[1];
                return `Dict[${mapType(keyType, builder, fullname)}, ${mapType(valueType, builder, fullname)}]`;
            } else  {
                return `${mapType(typeInstance.GenericDefinition, builder, fullname)}[${typeInstance.GenericArguments.map(arg => mapType(arg, builder, fullname)).join(', ')}]`;
            }
        } else {
            if (!typeInstance.Reference) {
                console.log('type-instance not resolved:', typeInstance);
            }
            if (typeInstance.Reference.SystemType) {
                if (TypeMappings.has(typeInstance.Reference.SystemType)) {
                    let name = TypeMappings.get(typeInstance.Reference.SystemType);
                    if (name.lastIndexOf('.') > -1) {
                        builder.addImport(name.substr(0, name.lastIndexOf('.')));
                    }
                    return name;
                }
            } else if (typeInstance.Reference.IsGenericPlaceholder) {
                let source = importPath(fullname, typeInstance.Reference.FullName);
                if (source) builder.addHierarchicalImport(source, typeInstance.Name, fullnameAlias(typeInstance.Reference.FullName));
                return fullnameAlias(typeInstance.Reference.FullName);
            } else if (typeInstance.Reference.MessageReference) {
                let source = importPath(fullname, typeInstance.Reference.FullName);
                if (source) builder.addHierarchicalImport(source, typeInstance.Name, fullnameAlias(typeInstance.Reference.MessageReference.Fullname));
                return fullnameAlias(typeInstance.Reference.MessageReference.Fullname);
            } else if (typeInstance.Reference.ServiceReference) {
                let source = importPath(fullname, typeInstance.Reference.FullName);
                if (source) builder.addHierarchicalImport(source, typeInstance.Name, fullnameAlias(typeInstance.Reference.ServiceReference.Fullname));
                return fullnameAlias(typeInstance.Reference.ServiceReference.Fullname);
            } else if (typeInstance.Reference.MessageInterfaceReference) {
                let source = importPath(fullname, typeInstance.Reference.FullName);
                if (source) builder.addHierarchicalImport(source, typeInstance.Name, fullnameAlias(typeInstance.Reference.MessageInterfaceReference.Fullname));
                return fullnameAlias(typeInstance.Reference.MessageInterfaceReference.Fullname);
            } else if (typeInstance.Reference.ServiceInterfaceReference) {
                let source = importPath(fullname, typeInstance.Reference.FullName);
                if (source) builder.addHierarchicalImport(source, typeInstance.Name, fullnameAlias(typeInstance.Reference.ServiceInterfaceReference.Fullname));
                return fullnameAlias(typeInstance.Reference.ServiceInterfaceReference.Fullname);
            }
            console.log('Type Not Found:', typeInstance);
            console.trace(`No System Type Mapping Found in CSharp for "${typeInstance.Reference.SystemType}"`);
            throw `No System Type Mapping Found in CSharp for "${typeInstance.Reference.SystemType}"`;
        }
    }

    export function AsEmitter(instance: Namespace): NamespaceEmitter;
    export function AsEmitter(instance: Service): ServiceEmitter;
    export function AsEmitter(instance: Message): MessageEmitter;
    export function AsEmitter(instance: ServiceInterface): ServiceInterfaceEmitter;
    export function AsEmitter(instance: MessageInterface): MessageInterfaceEmitter;
    export function AsEmitter(
        instance: Namespace | Service | Message | ServiceInterface | MessageInterface): 
        NamespaceEmitter | ServiceEmitter | MessageEmitter | ServiceInterfaceEmitter | MessageInterfaceEmitter  {
        switch (instance.Reflection) {
            case 'Namespace': return new NamespaceEmitter(instance as Namespace);
            case 'Service': return new ServiceEmitter(instance as Service);
            case 'Message': return new MessageEmitter(instance as Message);
            case 'ServiceInterface': return new ServiceInterfaceEmitter(instance as ServiceInterface);
            case 'MessageInterface': return new MessageInterfaceEmitter(instance as MessageInterface);
        }
        console.error('No available Emitter for:', instance);
        throw `Emitter is not available for instance of "${typeof instance}"`;
    }

    interface IImport {
        key: string;
        values?: string[];
        alias?: string;
    }

    function importBuilder(imports: Set<string>, hierarchicalImports: Map<string, Map<string, string>>) {
        let importNamespaces: string[] = [];
        let importLines: IImport[] = [];
        for (let key of hierarchicalImports.keys()) {
            let map = hierarchicalImports.get(key);
            let values: string[] = [];
            for (let name of map.keys()) {
                let alias = map.get(name);
                if (alias) {
                    values.push(`${name} as ${alias}`);
                } else {
                    values.push(name);
                }
            }
            values.sort();
            importLines.push({
                key: key,
                values: values
            });
        }
        importLines.sort((a, b) => {
            return a.key.localeCompare(b.key);
        });
        for (let importLine of importLines) {
            if (importLine.values) {
                importNamespaces.push(`from ${importLine.key} import ${importLine.values.join(', ')}`);
            } else if (importLine.alias) {
                importNamespaces.push(`import ${importLine.key} as ${importLine.alias}`);
            }
        }
        return importNamespaces.join('\r\n');
    }

    function emitComments(builder: CodeBuilder, indent: number, comments?: string) {
        if (typeof comments != 'string') return;
        let lines = comments.split('\n');
        if (lines.length == 1) {
            builder.appendLine(`'''${lines[0]}'''`, indent);
        } else if (lines.length > 1) {
            builder.appendLine(`'''`, indent);
            comments.split('\n')
                .map(line => line.replace(/^\s*/ig, ''))
                .map(line => line.replace(/\s*$/ig, ''))
                .map(line => line)
                .forEach(line => {
                    builder.appendLine(line, indent);
                });
            builder.appendLine(`'''`, indent);
        }
    }

    function emitMethodComments(builder: CodeBuilder, indent: number, method: Method) {
        if (method.Comments || method.Parameters.reduce((prev, arg) => prev + (arg.Comments ? 1 : 0), 0) > 0) {
            builder.appendLine(`'''`, indent);
            if (method.Comments) {
                let lines = method.Comments.split('\n');
                lines
                .map(line => line.replace(/^\s*/ig, ''))
                .map(line => line.replace(/\s*$/ig, ''))
                .map(line => line)
                .forEach(line => {
                    builder.appendLine(line, indent);
                });
            }
            for (let arg of method.Parameters) {
                if (arg.Comments) {
                    builder.appendLine(`:param ${arg.Name}: ${arg.Comments}`, indent);
                }
            }
            builder.appendLine(`'''`, indent);
        }
    }

    class NamespaceEmitter {
        constructor(private instance: Namespace) {
        }
        emitFiles(rootDirectory: string) {
            for (let key of this.instance.Children.keys()) {
                let child = this.instance.Children.get(key);
                switch (child.Reflection) {
                    case 'Namespace': {
                        let instance = child as Namespace;
                        CodeGeneration.AsEmitter(instance).emitFiles(rootDirectory);
                    }  break;
                    case 'Service': {
                        let instance = child as Service;
                        CodeGeneration.AsEmitter(instance).emitFile(rootDirectory);
                    } break;
                    case 'Message': {
                        let instance = child as Message;
                        CodeGeneration.AsEmitter(instance).emitFile(rootDirectory);
                    } break;
                    case 'MessageInterface': {
                        let instance = child as MessageInterface;
                        CodeGeneration.AsEmitter(instance).emitFile(rootDirectory);
                    } break;
                    case 'ServiceInterface': {
                        let instance = child as ServiceInterface;
                        CodeGeneration.AsEmitter(instance).emitFile(rootDirectory);
                    } break;
                }
            }
        }
    }

    class ServiceEmitter {
        constructor (private instance: Service) {}
        emitFile(rootDirectory: string) {
            let filename = path.join(rootDirectory, ...this.instance.Namespace, this.instance.Name + '.py');
            let builder: CodeBuilder = new CodeBuilder(importBuilder);
            let indent = 0;
            this.emitService(builder, indent);
            console.log('Write Code to:', filename);
            WriteFile(filename, builder.build(), 'utf-8');
        }
        emitGenericPlaceholder(method: Method, type: Type, builder: CodeBuilder) {
            return genericMethodTypeAlias(method.Name, this.emitType(type, builder));
        }
        emitGenericPlaceholders(builder: CodeBuilder, indent: number) {
            let placeholders: string[] = [];
            if (this.instance.IsGeneric) {
                this.instance.GenericArguments
                .map(arg => this.emitType(arg, builder))
                .forEach(placeholder => placeholders.push(placeholder));
            }
            for (let method of this.instance.Methods) {
                if (method.IsGeneric) {
                    for (let arg of method.GenericArguments){
                        placeholders.push(this.emitGenericPlaceholder(method, arg, builder));
                    }
                }
            }
            if (placeholders.length > 0) {
                builder.appendLine('', 0);
                builder.addHierarchicalImport('typing', 'TypeVar');
                for (let placeholder of placeholders) {
                    builder.appendLine(`${placeholder} = TypeVar('${placeholder}')`, indent);
                }
            }
        }
        emitHeritage(builder: CodeBuilder) {
            let baseTypes: string[] = [];
            if (this.instance.Base) {
                baseTypes.push(this.emitType(this.instance.Base, builder));
            } else {
                baseTypes.push(this.emitType(websocketServiceBaseType, builder));
            }
            if (Array.isArray(this.instance.Implementations)) {
                for (let implementation of this.instance.Implementations) {
                    baseTypes.push(this.emitType(implementation, builder));
                }
            }
            return baseTypes.join(', ');
        }
        emitService(builder: CodeBuilder, indent: number) {
            builder.addHierarchicalImport('abc', 'ABC');
            builder.addHierarchicalImport('abc', 'abstractmethod');
            let baseTypes: string[] = [];
            this.emitGenericPlaceholders(builder, indent);
            if (this.instance.Base) {
                baseTypes.push(this.emitType(this.instance.Base, builder));
            } else {
                baseTypes.push(this.emitType(websocketServiceBaseType, builder));
            }
            if (Array.isArray(this.instance.Implementations)) {
                for (let implementation of this.instance.Implementations) {
                    baseTypes.push(this.emitType(implementation, builder));
                }
            }
            let heritage = this.emitHeritage(builder);
            builder.appendLine('', 0);
            builder.appendLine(`class ${this.instance.Name}(${heritage}):`, indent);
            emitComments(builder, indent + 1, this.instance.Comments);
            this.emitServiceConstructor(builder, indent + 1);
            for (let method of this.instance.Methods) {
                this.emitServiceMethod(builder, indent + 1, method);
            }
            this.emitServiceInvokeMethod(builder, indent + 1);
        }
        emitServiceConstructor(builder: CodeBuilder, indent: number) {
            let fullname = this.instance.Fullname.join('.');
            builder.appendLine(`def __init__(self):`, indent);
            builder.appendLine(`super().__init__()`, indent + 1);
            builder.appendLine(`self.__reflection = '${fullname}'`, indent + 1);
            builder.appendLine('', 0);
        }
        emitServiceMethod(builder: CodeBuilder, indent: number, method: Method) {
            builder.appendLine(`@abstractmethod`, indent);
            builder.appendLine(`async def ${method.Name}(${this.emitMethodParameters(method.Parameters, builder, method)}) -> ${this.emitType(method.ReturnType, builder)}:`, indent);
            emitMethodComments(builder, indent + 1, method);
            builder.appendLine(`pass`, indent + 1);
            builder.appendLine('', 0);
        }
        emitType(typeInstance: Type, builder: CodeBuilder, method?: Method) {
            return CodeGeneration.mapType(typeInstance, builder, this.instance.Fullname, method);
        }
        emitMethodParameters(parameters: Parameter[], builder: CodeBuilder, method: Method) {
            let pairs = parameters
                .map(parameter => `${parameter.Name}: ${this.emitType(parameter.Type, builder, method)}`);
            pairs.unshift('self');
            return pairs.join(', ');
        }
        emitServiceInvokeMethod(builder: CodeBuilder, indent: number) {
            builder.appendLine(`async def __invoke(self, message: ${this.emitType(baseMessageType, builder)}) -> ${this.emitType(baseMessageType, builder)}:`, indent);
            let conditionIndent = indent + 1;
            let contentIndent = conditionIndent + 1;
            let switchIndex = 0;
            for (let method of this.instance.Methods) {
                if (switchIndex == 0) {
                    builder.appendLine(`if message.Method == '${method.Name}':`, conditionIndent);
                } else {
                    builder.appendLine(`elif message.Method == '${method.Name}':`, conditionIndent);
                }
                for (let parameter of method.Parameters) {
                    if (parameter.Type.Reference.IsGenericPlaceholder && !parameter.Type.Reference.IsClassGenericPlaceholder) {
                        builder.appendLine(`____${parameter.Name}: any = message.Payload['${parameter.Name}']`, contentIndent)
                    } else {
                        let parameterType = this.emitType(parameter.Type, builder);
                        builder.appendLine(`____${parameter.Name}: ${parameterType} = message.Payload['${parameter.Name}']`, contentIndent)
                    }
                }
                let parameterNames = method.Parameters
                        .map(parameter => `____${parameter.Name}`)
                        .join(', ');
                if (method.ReturnType.Reference === VoidType) {
                    builder.appendLine(`await self.${method.Name}(${parameterNames})`, contentIndent);
                } else {
                    builder.appendLine(`return ${this.emitType(returnMessageType, builder)}(message, await self.${method.Name}(${parameterNames}))`, contentIndent);
                }
                ++switchIndex;
            }
            builder.appendLine(`else:`, conditionIndent);
            builder.appendLine(`raise Exception(f'\{message.Service\}.\{message.Method\} is not defined.')`, contentIndent);
        }
    }

    class MessageEmitter {
        constructor (private instance: Message) {}
        emitFile(rootDirectory: string) {
            let filename = path.join(rootDirectory, ...this.instance.Namespace, this.instance.Name + '.py');
            let builder: CodeBuilder = new CodeBuilder(importBuilder);
            let indent = 0;
            this.emitMessage(builder, indent);
            console.log('Write Code to:', filename);
            WriteFile(filename, builder.build(), 'utf-8');
        }
        emitHeritage(builder: CodeBuilder) {
            let baseTypes: string[] = [];
            if (this.instance.IsGeneric) {
                builder.addHierarchicalImport('typing', 'TypedVar')
                let placeholders: string[] = [];
                this.instance.GenericArguments.map(arg => this.emitType(arg, builder))
                .forEach(placeholder => {
                    placeholders.push(placeholder);
                    builder.appendLine(`${placeholder} = TypedVar('${placeholder}')`)
                });
                baseTypes.push(`Generic[${placeholders.join(', ')}]`)
            }
            if (this.instance.Base) {
                baseTypes.push(this.emitType(this.instance.Base, builder));
            } else {
                baseTypes.push('TypedDict');
            }
            if (Array.isArray(this.instance.Implementations)) {
                for (let implementation of this.instance.Implementations) {
                    baseTypes.push(this.emitType(implementation, builder));
                }
            }
            return baseTypes.join(', ');
        }
        emitMessage(builder: CodeBuilder, indent: number) {
            builder.addHierarchicalImport('__future__', 'annotations');
            builder.addHierarchicalImport('typing', 'TypedDict');
            let heritage = this.emitHeritage(builder);
            builder.appendLine('', 0);
            builder.appendLine(`class ${this.instance.Name}(${heritage}):`, indent);
            emitComments(builder, indent + 1, this.instance.Comments);
            this.emitMessageConstructor(builder, indent + 1);
            let ReflectionProperty = new Property();
            ReflectionProperty.Name = '__reflection';
            ReflectionProperty.Type = StringType;
            this.emitProperty(builder, indent + 1, ReflectionProperty);
            for (let property of this.instance.Properties) {
                this.emitProperty(builder, indent + 1, property);
            }
        }
        emitMessageConstructor(builder: CodeBuilder, indent: number) {
            let fullname = this.instance.Fullname.join('.');
            builder.appendLine(`def __init__(self):`, indent);
            builder.appendLine(`super().__init__()`, indent + 1);
            builder.appendLine(`self.__reflection = '${fullname}'`, indent + 1);
            builder.appendLine('', 0);
        }
        emitProperty(builder: CodeBuilder, indent: number, property: Property) {
            let name = property.Name, type = this.emitType(property.Type, builder);
            builder.appendLine(`${name}: ${type}`, indent);
            emitComments(builder, indent + 1, property.Comments);
        }
        emitType(typeInstance: Type, builder: CodeBuilder) {
            return CodeGeneration.mapType(typeInstance, builder, this.instance.Fullname);
        }
    }

    class ServiceInterfaceEmitter {
        constructor(private instance: ServiceInterface) {}
        emitFile(rootDirectory: string) {
            let filename = path.join(rootDirectory, ...this.instance.Namespace, this.instance.Name + '.py');
            let builder: CodeBuilder = new CodeBuilder(importBuilder);
            let indent = 0;
            this.emitServiceInterface(builder, indent);
            console.log('Write Code to:', filename);
            WriteFile(filename, builder.build(), 'utf-8');
        }
        emitGenericPlaceholder(method: Method, type: Type, builder: CodeBuilder) {
            return genericMethodTypeAlias(method.Name, this.emitType(type, builder));
        }
        emitGenericPlaceholders(builder: CodeBuilder, indent: number) {
            let placeholders: string[] = [];
            if (this.instance.IsGeneric) {
                this.instance.GenericArguments
                .map(arg => this.emitType(arg, builder))
                .forEach(placeholder => placeholders.push(placeholder));
            }
            for (let method of this.instance.Methods) {
                if (method.IsGeneric) {
                    for (let arg of method.GenericArguments){
                        placeholders.push(this.emitGenericPlaceholder(method, arg, builder));
                    }
                }
            }
            if (placeholders.length > 0) {
                builder.appendLine('', 0);
                builder.addHierarchicalImport('typing', 'TypeVar');
                for (let placeholder of placeholders) {
                    builder.appendLine(`${placeholder} = TypeVar('${placeholder}')`, indent);
                }
            }
        }
        emitHeritage(builder: CodeBuilder) {
            let baseTypes: string[] = [];
            if (this.instance.IsGeneric) {
                let placeholders: string[] = this.instance.GenericArguments.map(arg => this.emitType(arg, builder));
                baseTypes.push(`Generic[${placeholders.join(', ')}]`)
            }
            if (this.instance.Base) {
                baseTypes.push(this.emitType(this.instance.Base, builder));
            } else {
                baseTypes.push('ABC');
            }
            return baseTypes.join(', ');
        }
        emitServiceInterface(builder: CodeBuilder, indent: number) {
            builder.addHierarchicalImport('abc', 'ABC');
            builder.addHierarchicalImport('abc', 'abstractmethod');
            this.emitGenericPlaceholders(builder, indent);
            let heritage = this.emitHeritage(builder);
            builder.appendLine('', 0);
            builder.appendLine(`class ${this.instance.Name}(${heritage}):`, indent);
            emitComments(builder, indent + 1, this.instance.Comments);
            for (let method of this.instance.Methods) {
                this.emitServiceMethod(builder, indent + 1, method);
            }
        }
        emitServiceMethod(builder: CodeBuilder, indent: number, method: Method) {
            builder.appendLine(`@abstractmethod`, indent);
            builder.appendLine(`async def ${method.Name}(${this.emitMethodParameters(method.Parameters, builder, method)}) -> ${this.emitType(method.ReturnType, builder, method)}:`, indent);
            emitMethodComments(builder, indent + 1, method);
            builder.appendLine(`pass`, indent + 1);
            builder.appendLine('', 0);
        }
        emitType(typeInstance: Type, builder: CodeBuilder, method?: Method) {
            return CodeGeneration.mapType(typeInstance, builder, this.instance.Fullname, method);
        }
        emitMethodParameters(parameters: Parameter[], builder: CodeBuilder, method: Method) {
            let pairs = parameters
                .map(parameter => `${parameter.Name}: ${this.emitType(parameter.Type, builder, method)}`);
            pairs.unshift('self');
            return pairs.join(', ');
        }
    }

    class MessageInterfaceEmitter {
        constructor(private instance: MessageInterface) {}
        emitFile(rootDirectory: string) {
            let filename = path.join(rootDirectory, ...this.instance.Namespace, this.instance.Name + '.py');
            let builder: CodeBuilder = new CodeBuilder(importBuilder);
            let indent = 0;
            this.emitMessageInterface(builder, indent);
            console.log('Write Code to:', filename);
            WriteFile(filename, builder.build(), 'utf-8');
        }
        emitHeritage(builder: CodeBuilder) {
            let baseTypes: string[] = [];
            if (this.instance.IsGeneric) {
                builder.addHierarchicalImport('typing', 'TypeVar')
                let placeholders: string[] = [];
                this.instance.GenericArguments.map(arg => this.emitType(arg, builder))
                .forEach(placeholder => {
                    placeholders.push(placeholder);
                    builder.appendLine(`${placeholder} = TypeVar('${placeholder}')`)
                });
                baseTypes.push(`Generic[${placeholders.join(', ')}]`)
            }
            if (this.instance.Base) {
                baseTypes.push(this.emitType(this.instance.Base, builder));
            } else {
                baseTypes.push('TypedDict')
            }
            return baseTypes.join(', ');
        }
        emitMessageInterface(builder: CodeBuilder, indent: number) {
            builder.addHierarchicalImport('typing', 'TypedDict');
            let heritage = this.emitHeritage(builder);
            builder.appendLine('', 0);
            builder.appendLine(`class ${this.instance.Name}(${heritage}):`, indent);
            emitComments(builder, indent + 1, this.instance.Comments);
            for (let property of this.instance.Properties) {
                this.emitProperty(builder, indent + 1, property);
            }
        }
        emitProperty(builder: CodeBuilder, indent: number, property: Property) {
            let name = property.Name, type = this.emitType(property.Type, builder);
            builder.appendLine(`${name}: ${type}`, indent);
            emitComments(builder, indent + 1, property.Comments);
        }
        emitType(typeInstance: Type, builder: CodeBuilder) {
            return CodeGeneration.mapType(typeInstance, builder, this.instance.Fullname);
        }
    }

    export class GroupAuthorizationsEmitter {
        keys: string[] = [];
        constructor (private groups: Map<string, GroupManagement>) {}
        emitFile(rootDirectory: string){
            let filename = path.join(rootDirectory, 'UniRpc/GroupAuthorizationPolicies.py');
            let builder: CodeBuilder = new CodeBuilder(importBuilder);
            let indent = 0;
            for (let key of this.groups.keys()) {
                this.keys.push(key);
            }
            this.keys.sort();
            for (let key of this.keys) {
                let group = this.groups.get(key);
                this.emitGroupPolicy(builder, indent, group);
            }
            this.emitPolicySets(builder, indent);
            console.log('Write Code to:', filename);
            WriteFile(filename, builder.build(), 'utf-8');
        }
        emitGroupPolicy(builder: CodeBuilder, indent: number, group: GroupManagement) {
            if (group.Authorizations.size == 0) return;
            let memberIndent = indent + 1;
            let memberContentIndent = memberIndent + 1;
            let serviceIndent = memberContentIndent + 1;
            builder.appendLine(`${group.Name} = {`, indent);
            let definedMembers: string[] = [];
            let memberCount = 0;
            for (let member of group.Members) {
                if (!group.Authorizations.has(member)) continue;
                let memberPolicy = group.Authorizations.get(member);
                if (memberPolicy.Services.size == 0) continue;
                definedMembers.push(member);
                ++memberCount;
            }
            let memberIndex = 0;
            for (let member of definedMembers) {
                let memberPolicy = group.Authorizations.get(member);
                let serviceSize = memberPolicy.Services.size;
                ++memberIndex;
                let memberComma = memberIndex < memberCount ? ',' : '';
                builder.appendLine(`'${member}': {`, memberIndent);
                builder.appendLine(`'Name': '${member}',`, memberContentIndent);
                builder.appendLine(`'Services': {`, memberContentIndent);
                let serviceIndex = 0;
                for (let service of memberPolicy.Services.keys()) {
                    ++serviceIndex;
                    let servicePolicy = memberPolicy.Services.get(service);
                    let serviceComma = serviceIndex < serviceSize ? ',' : '';
                    if (servicePolicy.AllowAll) {
                        builder.appendLine(`'${service}': '*'${serviceComma}`, serviceIndent);
                    } else if (servicePolicy.AllowMethods.size > 0) {
                        if (servicePolicy.AllowMethods.size == 0) continue;
                        let methods: string[] = [];
                        for (let method of servicePolicy.AllowMethods) {
                            methods.push(`'${method}'`);
                        }
                        methods.sort();
                        builder.appendLine(`'${service}': [${methods.join(', ')}]${serviceComma}`, serviceIndent);
                    }
                }
                builder.appendLine(`}`, memberContentIndent);
                builder.appendLine(`}${memberComma}`, memberIndent);
            }
            builder.appendLine(`}`, indent);
        }
        emitPolicySets(builder: CodeBuilder, indent: number) {
            builder.appendLine(`__PolicySets = {`, indent);
            let keysSize = this.keys.length;
            let contentIndent = indent + 1;
            let keyIndex = 0;
            for (let key of this.keys) {
                ++keyIndex;
                let comma = keyIndex < keysSize ? ',' : '';
                builder.appendLine(`'${key}': ${key}${comma}`, contentIndent);
            }
            builder.appendLine(`}`, indent)
        }
    }
}