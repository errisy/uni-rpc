import { Namespace, Service, Message, Method, Property, Parameter, Type, VoidType } from './definitions';
import { SourceFileResovler } from './resolvers';
import { RPC, Target } from './rpc-configuration';
import { CodeBuilder } from './code-builder';
import { CopyDirectory, CopyFile, MakeDirectories, Remove, ResolvePath, WriteFile } from './os-utilities';
import * as path from 'path';

export class TypeScriptBuilder {
    constructor (private resolver: SourceFileResovler) {
    }
    public emit(target: Target) {
        if (typeof target.cs == 'string') {
            let rootDirectory = ResolvePath(target.cs);
            switch (target.type) {
                case 'websocket-service': {
                    // the typescript node js lambda 
                    this.copyServiceFiles(rootDirectory);
                    for (let childNamespace of this.resolver.Children.values()) {
                        if (childNamespace.Fullname.length == 1) {
                            let topLevelNamespacePath = path.join(rootDirectory, childNamespace.Name);
                            Remove(topLevelNamespacePath);
                            childNamespace.emitTypeScriptServiceFiles(rootDirectory);
                        }
                    }
                } break;
                case 'websocket-client': {
                    
                } break;
                case 'lambda-websocket-service': {

                } break;
                case 'lambda-http-service': {

                } break;
            }
        }
    }
    private copyServiceFiles(rootDirectory: string) {
        // Remove Dir UniRpc
        let destination = path.normalize(path.join(rootDirectory, 'UniRpc'));
        console.log('Remove:', destination);
        Remove(destination);
        //
        MakeDirectories(destination);
        CopyDirectory('./transformers/typescript/websocket-service', destination);
    }
    private copyClientFiles(rootDirectory: string) {
        // Remove Dir UniRpc
        let destination = path.normalize(path.join(rootDirectory, 'UniRpc'));
        console.log('Remove:', destination);
        Remove(destination);
        //
        MakeDirectories(destination);
        CopyDirectory('./transformers/typescript/websocket-client', destination);
    }
}

declare module './definitions' {
    export interface Namespace {
        emitTypeScriptServiceFiles(rootDirectory: string): void;
        emitTypeScriptClientFiles(rootDirectory: string): void;
    }
    export interface Service {
        emitTypeScriptServiceFile(rootDirectory: string): void;
        emitTypeScriptClientFile(rootDirectory: string): void;
        emitTypeScriptService(builder: CodeBuilder, indent: number): void;
        emitTypeScriptServiceConstructor(builder: CodeBuilder, indent: number): void;
        emitTypeScriptServiceMethod(builder: CodeBuilder, indent: number, method: Method): void;
        emitTypeScriptType(typeInstance: Type, builder: CodeBuilder): void;
        emitTypeScriptParameters(parameters: Parameter[], builder: CodeBuilder): void;
        emitTypeScriptServiceInvokeMethod(builder: CodeBuilder, indent: number): void;
        emitTypeScriptClientFile(rootDirectory: string): void;
    }
    export interface Message {
        emitFile(rootDirectory: string): void;
        emitTypeScriptMessage(builder: CodeBuilder, indent: number): void;
        emitTypeScriptProperty(builder: CodeBuilder, indent: number, property: Property): void;
        emitTypeScriptType(typeInstance: Type, builder: CodeBuilder): void;
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
    TypeMappings.set('List', 'Array');
    TypeMappings.set('Dict', 'Map');
    TypeMappings.set('void', 'void');

    export function mapTypeScriptType(typeInstance: Type, builder: CodeBuilder): string {
        if (typeInstance.IsGenericPlaceholder) {
            return typeInstance.Name;
        }
        else if (typeInstance.IsGeneric) {
            if (typeInstance.GenericDefinition.Reference.SystemType &&
                typeInstance.GenericDefinition.Reference.SystemType == 'Array' ||
                typeInstance.GenericDefinition.Reference.SystemType == 'List') {
                // This is the special case for array.
                let arrayType = typeInstance.GenericArguments[0];
                return `${mapTypeScriptType(arrayType, builder)}[]`;
            } else {
                return `${mapTypeScriptType(typeInstance.GenericDefinition, builder)}<${typeInstance.GenericArguments.map(arg => mapTypeScriptType(arg, builder)).join(', ')}>`;
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
                return typeInstance.Reference.Name;
            } else if (typeInstance.Reference.MessageReference) {
                return typeInstance.Reference.MessageReference.Fullname.join('.');
            }
            console.log('Type Not Found:', typeInstance);
            console.trace(`No System Type Mapping Found in CSharp for "${typeInstance.Reference.SystemType}"`);
            throw `No System Type Mapping Found in CSharp for "${typeInstance.Reference.SystemType}"`;
        }
    }
}

class NamespaceEmitter extends Namespace {
    emitTypeScriptServiceFiles(rootDirectory: string) {
        for (let key of this.Children.keys()) {
            let child = this.Children.get(key);
            switch (child.Reflection) {
                case 'Namespace': {
                    let namespaceInstance = child as Namespace;
                    namespaceInstance.emitTypeScriptServiceFiles(rootDirectory);
                }  break;
                case 'Service': {
                    let serviceInstance = child as Service;
                    serviceInstance.emitTypeScriptServiceFile(rootDirectory);
                } break;
                case 'Message': {
                    let messageInstance = child as Message;
                    messageInstance.emitFile(rootDirectory);
                } break;
            }
        }
    }
    emitTypeScriptClientFiles(rootDirectory: string) {
        for (let service of this.Services) {
            service.emitTypeScriptClientFile(rootDirectory);
        }
    }
}

class ServiceEmitter extends Service {
    emitTypeScriptServiceFile(rootDirectory: string) {
        let filename = path.join(rootDirectory, ...this.Namespace, this.Name + '.cs');
        let builder: CodeBuilder = new CodeBuilder();
        let indent = 0;
        builder.appendLine(`namespace ${this.Namespace.join('.')}`, indent);
        builder.appendLine('{', indent);
        this.emitTypeScriptService(builder, indent + 1);
        builder.appendLine('}', indent);
        console.log('Write Code to:', filename);
        WriteFile(filename, builder.build(), 'utf-8');
    }
    emitTypeScriptService(builder: CodeBuilder, indent: number) {
        builder.addImport('System');
        builder.addImport('System.Collections.Generic');
        builder.addImport('UniRpc.WebApplication');
        if (this.IsGeneric) {
            let genericArugments = this.GenericArguments
                .map(arg => this.emitTypeScriptType(arg, builder))
                .join(', ');
            builder.appendLine(`public abstract class ${this.Name}<${genericArugments}>: WebSocketServiceBase`, indent);
        } else {
            builder.appendLine(`public abstract class ${this.Name}: WebSocketServiceBase`, indent);
        }
        builder.appendLine(`{`, indent);
        this.emitTypeScriptServiceConstructor(builder, indent + 1);
        for (let method of this.Methods) {
            this.emitTypeScriptServiceMethod(builder, indent + 1, method);
        }
        this.emitTypeScriptServiceInvokeMethod(builder, indent + 1);
        builder.appendLine(`}`, indent);
    }
    emitTypeScriptServiceConstructor(builder: CodeBuilder, indent: number) {
        let fullname = this.Fullname.join('.');
        builder.appendLine(`public ${this.Name}()`, indent);
        builder.appendLine(`{`, indent);
        builder.appendLine(`__reflection = "${fullname}";`, indent + 1);
        if (this.IsGeneric) {
            let genericTypeNames = this.GenericArguments
                .map(arg => `typeof(${arg.Name}).FullName`)
                .join(', ');
            builder.appendLine(`__genericArguments = new List<string>() { ${genericTypeNames} }.AsReadOnly();`, indent + 1);
        } else {
            builder.appendLine(`__genericArguments = new List<string>().AsReadOnly();`, indent + 1);
        }
        builder.appendLine(`}`, indent);
    }
    emitTypeScriptServiceMethod(builder: CodeBuilder, indent: number, method: Method) {
        if (method.IsGeneric) {
            let genericArugments = method.GenericArguments
                .map(arg => this.emitTypeScriptType(arg, builder))
                .join(', ');
                builder.appendLine(`public abstract ${this.emitTypeScriptType(method.ReturnType, builder)} ${method.Name}<${genericArugments}>(${this.emitTypeScriptParameters(method.Parameters, builder)});`, indent);
        } else {
            builder.appendLine(`public abstract ${this.emitTypeScriptType(method.ReturnType, builder)} ${method.Name}(${this.emitTypeScriptParameters(method.Parameters, builder)});`, indent);
        }
    }
    emitTypeScriptType(typeInstance: Type, builder: CodeBuilder) {
        return CodeGeneration.mapTypeScriptType(typeInstance, builder);
    }
    emitTypeScriptParameters(parameters: Parameter[], builder: CodeBuilder) {
        return parameters
            .map(parameter => `${this.emitTypeScriptType(parameter.Type, builder)} ${parameter.Name}`)
            .join(', ');
    }
    emitTypeScriptServiceInvokeMethod(builder: CodeBuilder, indent: number) {
        builder.appendLine(`public override BaseMessage __invoke(BaseMessage message)`, indent);
        builder.appendLine(`{`, indent);
        let switchIndent = indent + 1;
        let caseIndent = switchIndent + 1;
        let blockIndent = caseIndent + 1;
        let contentIndent = blockIndent + 1;
        builder.appendLine(`switch (message.Method)`, switchIndent);
        builder.appendLine(`{`, switchIndent);
        for (let method of this.Methods) {
            builder.appendLine(`case "${method.Name}":`, caseIndent);
            builder.appendLine(`{`, blockIndent);
            for (let parameter of method.Parameters) {
                if (parameter.Type.Reference.IsGenericPlaceholder && !parameter.Type.Reference.IsClassGenericPlaceholder) {
                    builder.appendLine(`object ____${parameter.Name} = message.Payload.GetPropertyByReflection("${parameter.Name}");`, contentIndent)
                } else {
                    let parameterType = this.emitTypeScriptType(parameter.Type, builder);
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

    emitTypeScriptClientFile(rootDirectory: string) {
        // emit the UniRpcFiles
        
    }
}

class MessageEmitter extends Message {
    emitFile(rootDirectory: string) {
        let filename = path.join(rootDirectory, ...this.Namespace, this.Name + '.cs');
        let builder: CodeBuilder = new CodeBuilder();
        let indent = 0;
        builder.appendLine(`namespace ${this.Namespace.join('.')}`, indent);
        builder.appendLine('{', indent);
        this.emitTypeScriptMessage(builder, indent + 1);
        builder.appendLine('}', indent);
        console.log('Write Code to:', filename);
        WriteFile(filename, builder.build(), 'utf-8');
    }
    emitTypeScriptMessage(builder: CodeBuilder, indent: number) {
        if (this.IsGeneric) {
            let genericArugments = this.GenericArguments
                .map(arg => this.emitTypeScriptType(arg, builder))
                .join(', ');
            builder.appendLine(`public abstract class ${this.Name} <${genericArugments}>`, indent);
        } else {
            builder.appendLine(`public abstract class ${this.Name}`, indent);
        }
        builder.appendLine(`{`, indent);
        let fullname = this.Fullname.join('.');
        builder.appendLine(`public string __reflection { get; set; } = "${fullname}";`, indent + 1);
        for (let property of this.Properties) {
            this.emitTypeScriptProperty(builder, indent + 1, property);
        }
        builder.appendLine(`}`, indent);
    }
    emitTypeScriptProperty(builder: CodeBuilder, indent: number, property: Property) {
        builder.appendLine(`public ${this.emitTypeScriptType(property.Type, builder)} ${property.Name} { get; set; }`, indent);
    }
    emitTypeScriptType(typeInstance: Type, builder: CodeBuilder) {
        return CodeGeneration.mapTypeScriptType(typeInstance, builder);
    }
}

Service.prototype.emitTypeScriptServiceFile = ServiceEmitter.prototype.emitTypeScriptServiceFile;
Service.prototype.emitTypeScriptClientFile = ServiceEmitter.prototype.emitTypeScriptClientFile;
Service.prototype.emitTypeScriptServiceConstructor = ServiceEmitter.prototype.emitTypeScriptServiceConstructor;
Service.prototype.emitTypeScriptServiceMethod = ServiceEmitter.prototype.emitTypeScriptServiceMethod;
Service.prototype.emitTypeScriptType = ServiceEmitter.prototype.emitTypeScriptType;
Service.prototype.emitTypeScriptParameters = ServiceEmitter.prototype.emitTypeScriptParameters;
Service.prototype.emitTypeScriptServiceInvokeMethod = ServiceEmitter.prototype.emitTypeScriptServiceInvokeMethod;
Service.prototype.emitTypeScriptService = ServiceEmitter.prototype.emitTypeScriptService;

Message.prototype.emitFile = MessageEmitter.prototype.emitFile;
Message.prototype.emitTypeScriptMessage = MessageEmitter.prototype.emitTypeScriptMessage;
Message.prototype.emitTypeScriptProperty = MessageEmitter.prototype.emitTypeScriptProperty;
Message.prototype.emitTypeScriptType = MessageEmitter.prototype.emitTypeScriptType;

Namespace.prototype.emitTypeScriptServiceFiles = NamespaceEmitter.prototype.emitTypeScriptServiceFiles;
Namespace.prototype.emitTypeScriptClientFiles = NamespaceEmitter.prototype.emitTypeScriptClientFiles;