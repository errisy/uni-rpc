import { Namespace, Service, Message, Method, Property, Parameter, Type, VoidType, ServiceInterface, MessageInterface } from './definitions';
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
        if (typeof target.ts == 'string' && target.type == 'websocket-lambda-service') {
            let rootDirectory = ResolvePath(target.ts);
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
        CopyDirectory('./transformers/typescript/websocket-lambda-service', destination);
    }
}

module CodeGeneration {
    const TypeMappings: Map<string, string> = new Map<string, string>();
    TypeMappings.set('boolean', 'boolean');
    TypeMappings.set('string', 'string');
    TypeMappings.set('float', 'number');
    TypeMappings.set('double', 'number');
    TypeMappings.set('integer', 'number');
    TypeMappings.set('long', 'number');
    TypeMappings.set('bytes', 'string');
    TypeMappings.set('void', 'void');
    TypeMappings.set('Promise', 'Promise');

    function importPath(consumer: string[], source: string[]): string | undefined {
        let origin = [...consumer], from = [...source];
        while (origin.length > 0 && from.length > 0 && origin[0] == from[0]) {
            origin.shift();
            from.shift();
        }
        if (origin.length == 0 && from.length == 0) return undefined;
        let referencePath = '';
        for (let i = 1; i < origin.length; ++i) {
            referencePath += '../';
        }
        if (referencePath == '') referencePath = './';
        return `${referencePath}${from.join('/')}`;
    }

    function fullnameAlias(fullname: string[]): string {
        return '$' + fullname.join('_');
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
    export function mapType(typeInstance: Type, builder: CodeBuilder, fullname: string[]): string {
        if (isSelfReference(typeInstance, fullname)) return typeInstance.Reference.Name;
        if (typeInstance.IsGenericPlaceholder) {
            return typeInstance.Name;
        } else if (typeInstance.IsGeneric) {
            if (typeInstance.GenericDefinition.Reference.SystemType &&
                ['Array', 'List'].includes(typeInstance.GenericDefinition.Reference.SystemType)) {
                // This is the special case for array.
                let arrayType = typeInstance.GenericArguments[0];
                return `${mapType(arrayType, builder, fullname)}[]`;
            } else if(typeInstance.GenericDefinition.Reference.SystemType &&
                ['Dict'].includes(typeInstance.GenericDefinition.Reference.SystemType)) {
                let keyType = typeInstance.GenericArguments[0];
                let valueType = typeInstance.GenericArguments[1];
                return `{[key: ${mapType(keyType, builder, fullname)}]:${mapType(valueType, builder, fullname)}}`;
            } else  {
                return `${mapType(typeInstance.GenericDefinition, builder, fullname)}<${typeInstance.GenericArguments.map(arg => mapType(arg, builder, fullname)).join(', ')}>`;
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
                importNamespaces.push(`import {${importLine.values.join(', ')}} from "${importLine.key}";`);
            } else if (importLine.alias) {
                importNamespaces.push(`import * as ${importLine.alias} from '${importLine.key}';`);
            }
        }
        return importNamespaces.join('\r\n');
    }

    function emitComments(builder: CodeBuilder, indent: number, comments?: string) {
        if (typeof comments != 'string') return;
        let lines = comments.split('\n');
        if (lines.length == 1) {
            builder.appendLine(`/** ${lines[0]} */`, indent);
        } else if (lines.length > 1) {
            builder.appendLine(`/**`, indent);
            comments.split('\n')
                .map(line => line.replace(/^\s*/ig, ''))
                .map(line => line.replace(/\s*$/ig, ''))
                .map(line => ` * ${line}`)
                .forEach(line => {
                    builder.appendLine(line, indent);
                });
            builder.appendLine(` */`, indent);
        }
    }

    function emitParameterComments(comments?: string) {
        if (typeof comments == 'string') {
            return `/** ${comments} */ `;
        }
        return '';
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
            let filename = path.join(rootDirectory, ...this.instance.Namespace, this.instance.Name + '.ts');
            let builder: CodeBuilder = new CodeBuilder(importBuilder);
            let indent = 0;
            this.emitService(builder, indent);
            console.log('Write Code to:', filename);
            WriteFile(filename, builder.build(), 'utf-8');
        }
        emitHeritage(builder: CodeBuilder) {
            let baseTypes: string[] = [], interfaces: string[] = [];
            if (this.instance.Base) {
                baseTypes.push(this.emitType(this.instance.Base, builder));
            } else {
                baseTypes.push(this.emitType(websocketServiceBaseType, builder));
            }
            if (Array.isArray(this.instance.Implementations)) {
                for (let implementation of this.instance.Implementations) {
                    interfaces.push(this.emitType(implementation, builder));
                }
            }
            let result: string = ''
            if (baseTypes.length > 0) {
                result += ` extends ${baseTypes.join(', ')}`;
            }
            if (interfaces.length > 0) {
                result += ` implements ${interfaces.join(', ')}`;
            }
            return result;
        }
        emitService(builder: CodeBuilder, indent: number) {
            let baseTypes: string[] = [];
            emitComments(builder, indent, this.instance.Comments);
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
            if (this.instance.IsGeneric) {
                let genericArugments = this.instance.GenericArguments
                    .map(arg => this.emitType(arg, builder))
                    .join(', ');
                builder.appendLine(`export abstract class ${this.instance.Name}<${genericArugments}>${heritage}`, indent);
            } else {
                builder.appendLine(`export abstract class ${this.instance.Name}${heritage}`, indent);
            }
            builder.appendLine(`{`, indent);
            this.emitServiceConstructor(builder, indent + 1);
            for (let method of this.instance.Methods) {
                this.emitServiceMethod(builder, indent + 1, method);
            }
            this.emitServiceInvokeMethod(builder, indent + 1);
            builder.appendLine(`}`, indent);
        }
        emitServiceConstructor(builder: CodeBuilder, indent: number) {
            let fullname = this.instance.Fullname.join('.');
            builder.appendLine(`public constructor () {`, indent);
            builder.appendLine(`super();`, indent + 1);
            builder.appendLine(`this.__reflection = '${fullname}';`, indent + 1);
            // if (this.instance.IsGeneric) {
            //     let genericTypeNames = this.instance.GenericArguments
            //         .map(arg => `typeof(${arg.Name}).FullName`)
            //         .join(', ');
            //     builder.appendLine(`this.__genericArguments = [${genericTypeNames}];`, indent + 1);
            // } else {
            //     builder.appendLine(`this.__genericArguments = [];`, indent + 1);
            // }
            builder.appendLine(`}`, indent);
        }
        emitServiceMethod(builder: CodeBuilder, indent: number, method: Method) {
            let methodContentIndent = indent + 1;
            emitComments(builder, indent, method.Comments);
            if (method.IsGeneric) {
                let genericArugments = method.GenericArguments
                    .map(arg => this.emitType(arg, builder))
                    .join(', ');
                    builder.appendLine(`public abstract ${method.Name}<${genericArugments}>(${this.emitMethodParameters(method.Parameters, builder)}): Promise<${this.emitType(method.ReturnType, builder)}>;`, indent);
            } else {
                builder.appendLine(`public abstract ${method.Name}(${this.emitMethodParameters(method.Parameters, builder)}): Promise<${this.emitType(method.ReturnType, builder)}>;`, indent);
            }
        }
        emitType(typeInstance: Type, builder: CodeBuilder) {
            return CodeGeneration.mapType(typeInstance, builder, this.instance.Fullname);
        }
        emitMethodParameters(parameters: Parameter[], builder: CodeBuilder) {
            return parameters
                .map(parameter => `${emitParameterComments(parameter.Comments)}${parameter.Name}: ${this.emitType(parameter.Type, builder)}`)
                .join(', ');
        }
        emitServiceInvokeMethod(builder: CodeBuilder, indent: number) {
            builder.appendLine(`public async __invoke(message: ${this.emitType(baseMessageType, builder)}): Promise<${this.emitType(baseMessageType, builder)}> {`, indent);
            let switchIndent = indent + 1;
            let caseIndent = switchIndent + 1;
            let blockIndent = caseIndent + 1;
            let contentIndent = blockIndent + 1;
            builder.appendLine(`switch (message.Method)`, switchIndent);
            builder.appendLine(`{`, switchIndent);
            for (let method of this.instance.Methods) {
                builder.appendLine(`case "${method.Name}":`, caseIndent);
                builder.appendLine(`{`, blockIndent);
                for (let parameter of method.Parameters) {
                    if (parameter.Type.Reference.IsGenericPlaceholder && !parameter.Type.Reference.IsClassGenericPlaceholder) {
                        builder.appendLine(`let ____${parameter.Name}: any = message.Payload['${parameter.Name}'];`, contentIndent)
                    } else {
                        let parameterType = this.emitType(parameter.Type, builder);
                        builder.appendLine(`let ____${parameter.Name}: ${parameterType} = message.Payload['${parameter.Name}'];`, contentIndent)
                    }
                }
                let parameterNames = method.Parameters
                        .map(parameter => `____${parameter.Name}`)
                        .join(', ');
                if (method.ReturnType.Reference === VoidType) {
                    builder.appendLine(`await this.${method.Name}(${parameterNames});`, contentIndent);
                    builder.appendLine(`break;`, contentIndent);
                } else {
                    builder.appendLine(`return ${this.emitType(returnMessageType, builder)}(message, await this.${method.Name}(${parameterNames}));`, contentIndent);
                }
                builder.appendLine(`}`, blockIndent);
            }
            builder.appendLine(`}`, switchIndent);
            builder.appendLine(`throw \`$\{message.Service\}.$\{message.Method\} is not defined.\`;`, switchIndent);
            builder.appendLine(`}`, indent);
        }
    }

    class MessageEmitter {
        constructor (private instance: Message) {}
        emitFile(rootDirectory: string) {
            let filename = path.join(rootDirectory, ...this.instance.Namespace, this.instance.Name + '.ts');
            let builder: CodeBuilder = new CodeBuilder(importBuilder);
            let indent = 0;
            this.emitMessage(builder, indent);
            console.log('Write Code to:', filename);
            WriteFile(filename, builder.build(), 'utf-8');
        }
        emitHeritage(builder: CodeBuilder) {
            let baseTypes: string[] = [], interfaces: string[] = [];
            if (this.instance.Base) {
                baseTypes.push(this.emitType(this.instance.Base, builder));
            }
            if (Array.isArray(this.instance.Implementations)) {
                for (let implementation of this.instance.Implementations) {
                    interfaces.push(this.emitType(implementation, builder));
                }
            }
            let result: string = ''
            if (baseTypes.length > 0) {
                result += ` extends ${baseTypes.join(', ')}`;
            }
            if (interfaces.length > 0) {
                result += ` implements ${interfaces.join(', ')}`;
            }
            return result;
        }
        emitMessage(builder: CodeBuilder, indent: number) {
            emitComments(builder, indent, this.instance.Comments);
            let heritage = this.emitHeritage(builder);
            if (this.instance.IsGeneric) {
                let genericArugments = this.instance.GenericArguments
                    .map(arg => this.emitType(arg, builder))
                    .join(', ');
                builder.appendLine(`export class ${this.instance.Name} <${genericArugments}>${heritage}`, indent);
            } else {
                builder.appendLine(`export class ${this.instance.Name}${heritage}`, indent);
            }
            builder.appendLine(`{`, indent);
            let fullname = this.instance.Fullname.join('.');
            builder.appendLine(`__reflection: string = '${fullname}';`, indent + 1);
            for (let property of this.instance.Properties) {
                this.emitProperty(builder, indent + 1, property);
            }
            builder.appendLine(`}`, indent);
        }
        emitProperty(builder: CodeBuilder, indent: number, property: Property) {
            emitComments(builder, indent, property.Comments);
            builder.appendLine(`public ${property.Name}: ${this.emitType(property.Type, builder)};`, indent);
        }
        emitType(typeInstance: Type, builder: CodeBuilder) {
            return CodeGeneration.mapType(typeInstance, builder, this.instance.Fullname);
        }
    }

    class ServiceInterfaceEmitter {
        constructor(private instance: ServiceInterface) {}
        emitFile(rootDirectory: string) {
            let filename = path.join(rootDirectory, ...this.instance.Namespace, this.instance.Name + '.ts');
            let builder: CodeBuilder = new CodeBuilder(importBuilder);
            let indent = 0;
            this.emitServiceInterface(builder, indent);
            console.log('Write Code to:', filename);
            WriteFile(filename, builder.build(), 'utf-8');
        }
        emitHeritage(builder: CodeBuilder) {
            let baseTypes: string[] = [];
            if (this.instance.Base) {
                baseTypes.push(this.emitType(this.instance.Base, builder));
            }
            if (baseTypes.length == 0) return '';
            else return ` extends ${baseTypes.join(', ')}`;
        }
        emitServiceInterface(builder: CodeBuilder, indent: number) {
            emitComments(builder, indent, this.instance.Comments);
            let heritage = this.emitHeritage(builder);
            if (this.instance.IsGeneric) {
                let genericArugments = this.instance.GenericArguments
                    .map(arg => this.emitType(arg, builder))
                    .join(', ');
                builder.appendLine(`export interface ${this.instance.Name}<${genericArugments}>${heritage}`, indent);
            } else {
                builder.appendLine(`export interface ${this.instance.Name}${heritage}`, indent);
            }
            builder.appendLine(`{`, indent);
            for (let method of this.instance.Methods) {
                this.emitServiceMethod(builder, indent + 1, method);
            }
            builder.appendLine(`}`, indent);
        }
        emitServiceMethod(builder: CodeBuilder, indent: number, method: Method) {
            emitComments(builder, indent, method.Comments);
            if (method.IsGeneric) {
                let genericArugments = method.GenericArguments
                    .map(arg => this.emitType(arg, builder))
                    .join(', ');
                    builder.appendLine(`${method.Name}<${genericArugments}>(${this.emitMethodParameters(method.Parameters, builder)}): Promise<${this.emitType(method.ReturnType, builder)}>;`, indent);
            } else {
                builder.appendLine(`${method.Name}(${this.emitMethodParameters(method.Parameters, builder)}): Promise<${this.emitType(method.ReturnType, builder)}>;`, indent);
            }
        }
        emitType(typeInstance: Type, builder: CodeBuilder) {
            return CodeGeneration.mapType(typeInstance, builder, this.instance.Fullname);
        }
        emitMethodParameters(parameters: Parameter[], builder: CodeBuilder) {
            return parameters
                .map(parameter => `${emitParameterComments(parameter.Comments)}${parameter.Name}: ${this.emitType(parameter.Type, builder)}`)
                .join(', ');
        }
    }

    class MessageInterfaceEmitter {
        constructor(private instance: MessageInterface) {}
        emitFile(rootDirectory: string) {
            let filename = path.join(rootDirectory, ...this.instance.Namespace, this.instance.Name + '.ts');
            let builder: CodeBuilder = new CodeBuilder(importBuilder);
            let indent = 0;
            builder.appendLine(`namespace ${this.instance.Namespace.join('.')}`, indent);
            builder.appendLine('{', indent);
            this.emitMessageInterface(builder, indent + 1);
            builder.appendLine('}', indent);
            console.log('Write Code to:', filename);
            WriteFile(filename, builder.build(), 'utf-8');
        }
        emitHeritage(builder: CodeBuilder) {
            let baseTypes: string[] = [];
            if (this.instance.Base) {
                baseTypes.push(this.emitType(this.instance.Base, builder));
            }
            if (baseTypes.length == 0) return '';
            else return ` : ${baseTypes.join(', ')}`;
        }
        emitMessageInterface(builder: CodeBuilder, indent: number) {
            emitComments(builder, indent, this.instance.Comments);
            let heritage = this.emitHeritage(builder);
            if (this.instance.IsGeneric) {
                let genericArugments = this.instance.GenericArguments
                    .map(arg => this.emitType(arg, builder))
                    .join(', ');
                builder.appendLine(`export interface ${this.instance.Name} <${genericArugments}>${heritage}`, indent);
            } else {
                builder.appendLine(`export interface ${this.instance.Name}${heritage}`, indent);
            }
            builder.appendLine(`{`, indent);
            let fullname = this.instance.Fullname.join('.');
            for (let property of this.instance.Properties) {
                this.emitProperty(builder, indent + 1, property);
            }
            builder.appendLine(`}`, indent);
        }
        emitProperty(builder: CodeBuilder, indent: number, property: Property) {
            emitComments(builder, indent, property.Comments);
            builder.appendLine(`public ${property.Name}: ${this.emitType(property.Type, builder)};`, indent);
        }
        emitType(typeInstance: Type, builder: CodeBuilder) {
            return CodeGeneration.mapType(typeInstance, builder, this.instance.Fullname);
        }
    }

    export class GroupAuthorizationsEmitter {
        keys: string[] = [];
        constructor (private groups: Map<string, GroupManagement>) {}
        emitFile(rootDirectory: string){
            let filename = path.join(rootDirectory, 'UniRpc/GroupAuthorizationPolicies.ts');
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
            builder.appendLine(`export const ${group.Name} = {`, indent);
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
                builder.appendLine(`${member}: {`, memberIndent);
                builder.appendLine(`Name: '${member}',`, memberContentIndent);
                builder.appendLine(`Services: {`, memberContentIndent);
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
            builder.appendLine(`};`, indent);
        }
        emitPolicySets(builder: CodeBuilder, indent: number) {
            builder.appendLine(`export const __PolicySets = {`, indent);
            let keysSize = this.keys.length;
            let contentIndent = indent + 1;
            let keyIndex = 0;
            for (let key of this.keys) {
                ++keyIndex;
                let comma = keyIndex < keysSize ? ',' : '';
                builder.appendLine(`${key}: ${key}${comma}`, contentIndent);
            }
            builder.appendLine(`};`, indent)
        }
    }
}