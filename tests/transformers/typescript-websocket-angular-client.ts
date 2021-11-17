import { Namespace, Service, Message, Method, Property, Parameter, Type, VoidType, ServiceInterface, MessageInterface } from './definitions';
import { SourceFileResovler } from './resolvers';
import { RPC, Target } from './rpc-configuration';
import { CodeBuilder } from './code-builder';
import { CopyDirectory, MakeDirectories, Remove, ResolvePath, WriteFile } from './os-utilities';
import * as path from 'path';

export class Transpiler {
    constructor (private resolver: SourceFileResovler) {
    }
    public emit(target: Target) {
        if (typeof target.ts == 'string' && target.type == 'websocket-angular-client') {
            let rootDirectory = ResolvePath(target.ts);
            this.copyBaseFiles(rootDirectory);
            for (let instance of this.resolver.Children.values()) {
                if (instance.Fullname.length == 1) {
                    let topLevelNamespacePath = path.join(rootDirectory, instance.Name);
                    Remove(topLevelNamespacePath);
                    CodeGeneration.AsEmitter(instance).emitFiles(rootDirectory);
                }
            }
        }
    }
    private copyBaseFiles(rootDirectory: string) {
        let destination = path.normalize(path.join(rootDirectory, 'UniRpc'));
        console.log('Remove:', destination);
        Remove(destination);
        MakeDirectories(destination);
        CopyDirectory('./transformers/typescript/websocket-angular-client', destination);
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
        if (origin.length == 0 && source.length == 0) return undefined;
        let referencePath = '';
        for (let i = 2; i < origin.length; ++i) {
            referencePath += '../';
        }
        if (referencePath == '') referencePath = './';
        return `${referencePath}${from.join('/')}`;
    }

    function fullnameAlias(fullname: string[]): string {
        return '$' + fullname.join('_');
    }

    export function mapType(typeInstance: Type, builder: CodeBuilder, fullname: string[]): string {
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
                let source = importPath(fullname, typeInstance.FullName);
                if (source) builder.addHierarchicalImports(source, typeInstance.Name, fullnameAlias(typeInstance.FullName));
                return typeInstance.Reference.Name;
            } else if (typeInstance.Reference.MessageReference) {
                let source = importPath(fullname, typeInstance.FullName);
                if (source) builder.addHierarchicalImports(source, typeInstance.Name, fullnameAlias(typeInstance.FullName));
                return typeInstance.Reference.MessageReference.Fullname.join('.');
            } else if (typeInstance.Reference.ServiceReference) {
                let source = importPath(fullname, typeInstance.FullName);
                if (source) builder.addHierarchicalImports(source, typeInstance.Name, fullnameAlias(typeInstance.FullName));
                return typeInstance.Reference.ServiceReference.Fullname.join('.');
            } else if (typeInstance.Reference.MessageInterfaceReference) {
                let source = importPath(fullname, typeInstance.FullName);
                if (source) builder.addHierarchicalImports(source, typeInstance.Name, fullnameAlias(typeInstance.FullName));
                return typeInstance.Reference.MessageInterfaceReference.Fullname.join('.');
            } else if (typeInstance.Reference.ServiceInterfaceReference) {
                let source = importPath(fullname, typeInstance.FullName);
                if (source) builder.addHierarchicalImports(source, typeInstance.Name, fullnameAlias(typeInstance.FullName));
                return typeInstance.Reference.ServiceInterfaceReference.Fullname.join('.');
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
            builder.addHierarchicalImports('@angular/core', 'Injectable');
            this.emitService(builder, indent);
            console.log('Write Code to:', filename);
            WriteFile(filename, builder.build(), 'utf-8');
        }
        emitHeritage(builder: CodeBuilder) {
            let baseTypes: string[] = [];
            if (this.instance.Base) {
                baseTypes.push(this.emitType(this.instance.Base, builder));
            } else {
                baseTypes.push('WebSocketServiceBase');
            }
            if (Array.isArray(this.instance.Implementations)) {
                for (let implementation of this.instance.Implementations) {
                    baseTypes.push(this.emitType(implementation, builder));
                }
            }
            return ` : ${baseTypes.join(', ')}`;
        }
        emitService(builder: CodeBuilder, indent: number) {
            builder.addImport('System');
            builder.addImport('System.Collections.Generic');
            builder.addImport('UniRpc.WebApplication');
            let baseTypes: string[] = [];
            builder.appendLine('@Injectable({', indent);
            builder.appendLine(`providedIn: 'root'`, indent + 1);
            builder.appendLine(`})`, indent);
            if (this.instance.Base) {
                baseTypes.push(this.emitType(this.instance.Base, builder));
            } else {
                baseTypes.push('WebSocketServiceBase');
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
                builder.appendLine(`export class ${this.instance.Name}<${genericArugments}>${heritage}`, indent);
            } else {
                builder.appendLine(`export class ${this.instance.Name}${heritage}`, indent);
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
            builder.appendLine(`public ${this.instance.Name}()`, indent);
            builder.appendLine(`{`, indent);
            builder.appendLine(`__reflection = "${fullname}";`, indent + 1);
            if (this.instance.IsGeneric) {
                let genericTypeNames = this.instance.GenericArguments
                    .map(arg => `typeof(${arg.Name}).FullName`)
                    .join(', ');
                builder.appendLine(`__genericArguments = new List<string>() { ${genericTypeNames} }.AsReadOnly();`, indent + 1);
            } else {
                builder.appendLine(`__genericArguments = new List<string>().AsReadOnly();`, indent + 1);
            }
            builder.appendLine(`}`, indent);
        }
        emitServiceMethod(builder: CodeBuilder, indent: number, method: Method) {
            if (method.IsGeneric) {
                let genericArugments = method.GenericArguments
                    .map(arg => this.emitType(arg, builder))
                    .join(', ');
                    builder.appendLine(`public ${this.emitType(method.ReturnType, builder)} ${method.Name}<${genericArugments}>(${this.emitMethodParameters(method.Parameters, builder)});`, indent);
            } else {
                builder.appendLine(`public ${this.emitType(method.ReturnType, builder)} ${method.Name}(${this.emitMethodParameters(method.Parameters, builder)});`, indent);
            }
        }
        emitType(typeInstance: Type, builder: CodeBuilder) {
            return CodeGeneration.mapType(typeInstance, builder, this.instance.Fullname);
        }
        emitMethodParameters(parameters: Parameter[], builder: CodeBuilder) {
            return parameters
                .map(parameter => `${this.emitType(parameter.Type, builder)} ${parameter.Name}`)
                .join(', ');
        }
        emitServiceInvokeMethod(builder: CodeBuilder, indent: number) {
            builder.appendLine(`public override BaseMessage __invoke(BaseMessage message)`, indent);
            builder.appendLine(`{`, indent);
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
                        builder.appendLine(`object ____${parameter.Name} = message.Payload.GetPropertyByReflection("${parameter.Name}");`, contentIndent)
                    } else {
                        let parameterType = this.emitType(parameter.Type, builder);
                        builder.appendLine(`${parameterType} ____${parameter.Name} = message.Payload.GetProperty<${parameterType}>("${parameter.Name}");`, contentIndent)
                    }
                }
                let parameterNames = method.Parameters
                        .map(parameter => `____${parameter.Name}`)
                        .join(', ');
                if (method.ReturnType.Reference === VoidType) {
                    builder.appendLine(`${method.Name}(${parameterNames});`, contentIndent);
                    builder.appendLine(`break;`, contentIndent);
                } else {
                    builder.appendLine(`return message.ReturnMessage(${method.Name}(${parameterNames}));`, contentIndent);
                }
                builder.appendLine(`}`, blockIndent);
            }
            builder.appendLine(`}`, switchIndent);
            builder.appendLine(`throw new NotImplementedException($"{message.Service}.{message.Method} is not implemented.");`, switchIndent);
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
            let baseTypes: string[] = [];
            if (this.instance.Base) {
                baseTypes.push(this.emitType(this.instance.Base, builder));
            }
            if (Array.isArray(this.instance.Implementations)) {
                for (let implementation of this.instance.Implementations) {
                    baseTypes.push(this.emitType(implementation, builder));
                }
            }
            if (baseTypes.length > 0) {
                return ` : ${baseTypes.join(', ')}`;
            } else {
                return '';
            }
        }
        emitMessage(builder: CodeBuilder, indent: number) {
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
            builder.appendLine(`public ${this.instance.Base ? 'override' : 'virtual'} string __reflection { get; set; } = "${fullname}";`, indent + 1);
            for (let property of this.instance.Properties) {
                this.emitProperty(builder, indent + 1, property);
            }
            builder.appendLine(`}`, indent);
        }
        emitProperty(builder: CodeBuilder, indent: number, property: Property) {
            builder.appendLine(`public ${this.emitType(property.Type, builder)} ${property.Name} { get; set; }`, indent);
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
            builder.appendLine(`namespace ${this.instance.Namespace.join('.')}`, indent);
            builder.appendLine('{', indent);
            this.emitServiceInterface(builder, indent + 1);
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
        emitServiceInterface(builder: CodeBuilder, indent: number) {
            builder.addImport('System');
            builder.addImport('System.Collections.Generic');
            builder.addImport('UniRpc.WebApplication');
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
            if (method.IsGeneric) {
                let genericArugments = method.GenericArguments
                    .map(arg => this.emitType(arg, builder))
                    .join(', ');
                    builder.appendLine(`public ${this.emitType(method.ReturnType, builder)} ${method.Name}<${genericArugments}>(${this.emitMethodParameters(method.Parameters, builder)});`, indent);
            } else {
                builder.appendLine(`public ${this.emitType(method.ReturnType, builder)} ${method.Name}(${this.emitMethodParameters(method.Parameters, builder)});`, indent);
            }
        }
        emitType(typeInstance: Type, builder: CodeBuilder) {
            return CodeGeneration.mapType(typeInstance, builder, this.instance.Fullname);
        }
        emitMethodParameters(parameters: Parameter[], builder: CodeBuilder) {
            return parameters
                .map(parameter => `${this.emitType(parameter.Type, builder)} ${parameter.Name}`)
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
            builder.appendLine(`public ${this.emitType(property.Type, builder)} ${property.Name} { get; set; }`, indent);
        }
        emitType(typeInstance: Type, builder: CodeBuilder) {
            return CodeGeneration.mapType(typeInstance, builder, this.instance.Fullname);
        }
    }
}