import { Namespace, Service, Message, Method, Property, Parameter, Type, VoidType } from './definitions';
import { SourceFileResovler } from './resolvers';
import { RPC, Target } from './rpc-configuration';
import { CodeBuilder } from './code-builder';
import { CopyDirectory, CopyFile, MakeDirectories, Remove, ResolvePath, WriteFile } from './os-utilities';
import * as path from 'path';

export class CSharpBuilder {
    constructor (private resolver: SourceFileResovler) {
    }
    public emit(target: Target) {
        if (typeof target.cs == 'string') {
            let rootDirectory = ResolvePath(target.cs);
            switch (target.type) {
                case 'websocket-service': {
                    this.copyWebSocketServiceFiles(rootDirectory);
                    for (let childNamespace of this.resolver.Children.values()) {
                        if (childNamespace.Fullname.length == 1) {
                            let topLevelNamespacePath = path.join(rootDirectory, childNamespace.Name);
                            Remove(topLevelNamespacePath);
                            childNamespace.emitCSharpServiceFiles(rootDirectory);
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
    private copyWebSocketServiceFiles(rootDirectory: string) {
        // Remove Dir UniRpc
        let destination = path.normalize(path.join(rootDirectory, 'UniRpc'));
        console.log('Remove:', destination);
        Remove(destination);
        //
        MakeDirectories(destination);
        CopyDirectory('./transformers/csharp/websocket-service', destination);
    }
}

declare module './definitions' {
    export interface Namespace {
        emitCSharpServiceFiles(rootDirectory: string): void;
        emitCSharpClientFiles(rootDirectory: string): void;
    }
    export interface Service {
        emitCSharpServiceFile(rootDirectory: string): void;
        emitCSharpClientFile(rootDirectory: string): void;
        emitCSharpService(builder: CodeBuilder, indent: number): void;
        emitCSharpServiceConstructor(builder: CodeBuilder, indent: number): void;
        emitCSharpServiceMethod(builder: CodeBuilder, indent: number, method: Method): void;
        emitCSharpType(typeInstance: Type, builder: CodeBuilder): void;
        emitCSharpParameters(parameters: Parameter[], builder: CodeBuilder): void;
        emitCSharpServiceInvokeMethod(builder: CodeBuilder, indent: number): void;
        emitCSharpClientFile(rootDirectory: string): void;
    }
    export interface Message {
        emitFile(rootDirectory: string): void;
        emitCSharpMessage(builder: CodeBuilder, indent: number): void;
        emitCSharpProperty(builder: CodeBuilder, indent: number, property: Property): void;
        emitCSharpType(typeInstance: Type, builder: CodeBuilder): void;
    }
}

module CodeGeneration {
    const TypeMappings: Map<string, string> = new Map<string, string>();
    TypeMappings.set('boolean', 'bool');
    TypeMappings.set('string', 'string');
    TypeMappings.set('float', 'float');
    TypeMappings.set('double', 'double');
    TypeMappings.set('integer', 'int');
    TypeMappings.set('long', 'long');
    TypeMappings.set('bytes', 'byte[]');
    TypeMappings.set('List', 'System.Collections.Generic.List');
    TypeMappings.set('Dict', 'System.Collections.Generic.Dictionary');
    TypeMappings.set('void', 'void');

    export function mapCSharpType(typeInstance: Type, builder: CodeBuilder): string {
        if (typeInstance.IsGenericPlaceholder) {
            return typeInstance.Name;
        }
        else if (typeInstance.IsGeneric) {
            if (typeInstance.GenericDefinition.Reference.SystemType &&
                typeInstance.GenericDefinition.Reference.SystemType == 'Array') {
                // This is the special case for array.
                let arrayType = typeInstance.GenericArguments[0];
                return `${mapCSharpType(arrayType, builder)}[]`;
            } else {
                return `${mapCSharpType(typeInstance.GenericDefinition, builder)}<${typeInstance.GenericArguments.map(arg => mapCSharpType(arg, builder)).join(', ')}>`;
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
    emitCSharpServiceFiles(rootDirectory: string) {
        for (let key of this.Children.keys()) {
            let child = this.Children.get(key);
            switch (child.Reflection) {
                case 'Namespace': {
                    let namespaceInstance = child as Namespace;
                    namespaceInstance.emitCSharpServiceFiles(rootDirectory);
                }  break;
                case 'Service': {
                    let serviceInstance = child as Service;
                    serviceInstance.emitCSharpServiceFile(rootDirectory);
                } break;
                case 'Message': {
                    let messageInstance = child as Message;
                    messageInstance.emitFile(rootDirectory);
                } break;
            }
        }
    }
    emitCSharpClientFiles(rootDirectory: string) {
        for (let service of this.Services) {
            service.emitCSharpClientFile(rootDirectory);
        }
    }
}

class ServiceEmitter extends Service {
    emitCSharpServiceFile(rootDirectory: string) {
        let filename = path.join(rootDirectory, ...this.Namespace, this.Name + '.cs');
        let builder: CodeBuilder = new CodeBuilder();
        let indent = 0;
        builder.appendLine(`namespace ${this.Namespace.join('.')}`, indent);
        builder.appendLine('{', indent);
        this.emitCSharpService(builder, indent + 1);
        builder.appendLine('}', indent);
        console.log('Write Code to:', filename);
        WriteFile(filename, builder.build(), 'utf-8');
    }
    emitCSharpService(builder: CodeBuilder, indent: number) {
        builder.addImport('System');
        builder.addImport('System.Collections.Generic');
        builder.addImport('UniRpc.WebApplication');
        if (this.IsGeneric) {
            let genericArugments = this.GenericArguments
                .map(arg => this.emitCSharpType(arg, builder))
                .join(', ');
            builder.appendLine(`public abstract class ${this.Name}<${genericArugments}>: WebSocketServiceBase`, indent);
        } else {
            builder.appendLine(`public abstract class ${this.Name}: WebSocketServiceBase`, indent);
        }
        builder.appendLine(`{`, indent);
        this.emitCSharpServiceConstructor(builder, indent + 1);
        for (let method of this.Methods) {
            this.emitCSharpServiceMethod(builder, indent + 1, method);
        }
        this.emitCSharpServiceInvokeMethod(builder, indent + 1);
        builder.appendLine(`}`, indent);
    }
    emitCSharpServiceConstructor(builder: CodeBuilder, indent: number) {
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
    emitCSharpServiceMethod(builder: CodeBuilder, indent: number, method: Method) {
        if (method.IsGeneric) {
            let genericArugments = method.GenericArguments
                .map(arg => this.emitCSharpType(arg, builder))
                .join(', ');
                builder.appendLine(`public abstract ${this.emitCSharpType(method.ReturnType, builder)} ${method.Name}<${genericArugments}>(${this.emitCSharpParameters(method.Parameters, builder)});`, indent);
        } else {
            builder.appendLine(`public abstract ${this.emitCSharpType(method.ReturnType, builder)} ${method.Name}(${this.emitCSharpParameters(method.Parameters, builder)});`, indent);
        }
    }
    emitCSharpType(typeInstance: Type, builder: CodeBuilder) {
        return CodeGeneration.mapCSharpType(typeInstance, builder);
    }
    emitCSharpParameters(parameters: Parameter[], builder: CodeBuilder) {
        return parameters
            .map(parameter => `${this.emitCSharpType(parameter.Type, builder)} ${parameter.Name}`)
            .join(', ');
    }
    emitCSharpServiceInvokeMethod(builder: CodeBuilder, indent: number) {
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
                    let parameterType = this.emitCSharpType(parameter.Type, builder);
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

    emitCSharpClientFile(rootDirectory: string) {
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
        this.emitCSharpMessage(builder, indent + 1);
        builder.appendLine('}', indent);
        console.log('Write Code to:', filename);
        WriteFile(filename, builder.build(), 'utf-8');
    }
    emitCSharpMessage(builder: CodeBuilder, indent: number) {
        if (this.IsGeneric) {
            let genericArugments = this.GenericArguments
                .map(arg => this.emitCSharpType(arg, builder))
                .join(', ');
            builder.appendLine(`public abstract class ${this.Name} <${genericArugments}>`, indent);
        } else {
            builder.appendLine(`public abstract class ${this.Name}`, indent);
        }
        builder.appendLine(`{`, indent);
        let fullname = this.Fullname.join('.');
        builder.appendLine(`public string __reflection { get; set; } = "${fullname}";`, indent + 1);
        for (let property of this.Properties) {
            this.emitCSharpProperty(builder, indent + 1, property);
        }
        builder.appendLine(`}`, indent);
    }
    emitCSharpProperty(builder: CodeBuilder, indent: number, property: Property) {
        builder.appendLine(`public ${this.emitCSharpType(property.Type, builder)} ${property.Name} { get; set; }`, indent);
    }
    emitCSharpType(typeInstance: Type, builder: CodeBuilder) {
        return CodeGeneration.mapCSharpType(typeInstance, builder);
    }
}

Service.prototype.emitCSharpServiceFile = ServiceEmitter.prototype.emitCSharpServiceFile;
Service.prototype.emitCSharpClientFile = ServiceEmitter.prototype.emitCSharpClientFile;
Service.prototype.emitCSharpServiceConstructor = ServiceEmitter.prototype.emitCSharpServiceConstructor;
Service.prototype.emitCSharpServiceMethod = ServiceEmitter.prototype.emitCSharpServiceMethod;
Service.prototype.emitCSharpType = ServiceEmitter.prototype.emitCSharpType;
Service.prototype.emitCSharpParameters = ServiceEmitter.prototype.emitCSharpParameters;
Service.prototype.emitCSharpServiceInvokeMethod = ServiceEmitter.prototype.emitCSharpServiceInvokeMethod;
Service.prototype.emitCSharpService = ServiceEmitter.prototype.emitCSharpService;

Message.prototype.emitFile = MessageEmitter.prototype.emitFile;
Message.prototype.emitCSharpMessage = MessageEmitter.prototype.emitCSharpMessage;
Message.prototype.emitCSharpProperty = MessageEmitter.prototype.emitCSharpProperty;
Message.prototype.emitCSharpType = MessageEmitter.prototype.emitCSharpType;

Namespace.prototype.emitCSharpServiceFiles = NamespaceEmitter.prototype.emitCSharpServiceFiles;
Namespace.prototype.emitCSharpClientFiles = NamespaceEmitter.prototype.emitCSharpClientFiles;