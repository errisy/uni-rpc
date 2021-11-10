import { Namespace, Service, Message, Method, Property, Parameter, Type, VoidType } from './definitions';
import { SourceFileResovler } from './resolvers';
import { RPC, Target } from './rpc-configuration';
import { CodeBuilder } from './code-builder';
import { CopyFile, MakeDirectories, Remove, ResolvePath } from './os-utilities';
import * as path from 'path';

export class CSharpBuilder {
    constructor (private resolver: SourceFileResovler) {
    }
    public emit(target: Target) {
        if (typeof target.cs == 'string') {
            let rootDirectory = ResolvePath(target.cs);
            switch (target.type) {
                case 'service': {
                    this.copyServiceFiles(rootDirectory);
                    for (let childNamespace of this.resolver.Children.values()) {
                        childNamespace.emitServiceFiles(rootDirectory);
                    }
                } break;
                case 'client': {
                    
                } break;
            }
        }
    }
    private copyServiceFiles(rootDirectory: string) {
        // Remove Dir UniRpc
        let destination = path.normalize(path.join(rootDirectory, 'UniRpc'));
        Remove(destination);
        //
        MakeDirectories(destination);
        CopyFile('./transformers/csharp/BaseMessage.cs',  destination);
        CopyFile('./transformers/csharp/WebApplicationExtensions.cs',  destination);
        CopyFile('./transformers/csharp/WebSocketService.cs',  destination);
        CopyFile('./transformers/csharp/WebSocketServiceBase.cs',  destination);
    }
}

declare module './definitions' {
    export interface Namespace {
        emitServiceFiles(rootDirectory: string): void;
        emitClientFiles(rootDirectory: string): void;
    }
    export interface Service {
        emitCSharpServiceFile(rootDirectory: string): void;
        emitCSharpClientFile(rootDirectory: string): void;
        emitCSharpService(builder: CodeBuilder, indent: number);
        emitCSharpServiceConstructor(builder: CodeBuilder, indent: number);
        emitCSharpServiceMethod(builder: CodeBuilder, indent: number, method: Method);
        emitCSharpType(typeInstance: Type, builder: CodeBuilder);
        emitCSharpParameters(parameters: Parameter[], builder: CodeBuilder);
        emitCSharpServiceInvokeMethod(builder: CodeBuilder, indent: number);
        emitCSharpClientFile(rootDirectory: string)
    }
    export interface Message {
        emitFile(rootDirectory: string): void;
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

    export function mapCSType(typeInstance: Type, builder: CodeBuilder): string {
        if (typeInstance.IsGeneric) {
            if (typeInstance.GenericDefinition.Reference.SystemType &&
                typeInstance.GenericDefinition.Reference.SystemType == 'Array') {
                // This is the special case for array.
                let arrayType = typeInstance.GenericArguments[0];
                return `${mapCSType(arrayType, builder)}[]`;
            } else {
                return `${mapCSType(typeInstance.GenericDefinition, builder)}<${typeInstance.GenericArguments.map(arg => mapCSType(arg, builder)).join(', ')}>`;
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
            } else if (typeInstance.Reference.MessageReference) {
                return typeInstance.Reference.MessageReference.Fullname.join('.');
            }
            throw `No System Type Mapping Found in CSharp for "${typeInstance.Reference.SystemType}"`;
        }
    }
}


class NamespaceEmitter extends Namespace {
    emitServiceFiles(rootDirectory: string) {
        for (let service of this.Services) {
            service.emitCSharpServiceFile(rootDirectory);
        }
    }
    emitClientFiles(rootDirectory: string) {
        for (let service of this.Services) {
            service.emitCSharpClientFile(rootDirectory);
        }
    }
}

class ServiceEmitter extends Service {
    emitCSharpServiceFile(rootDirectory: string) {
        let filename = `${rootDirectory}/${this.Fullname.join('/')}.cs`;
        let builder: CodeBuilder = new CodeBuilder();
        let indent = 0;
        builder.appendLine(`namespace ${this.Namespace.join('.')}`, indent);
        builder.appendLine('{', indent);
        this.emitCSharpService(builder, indent + 1);
        builder.appendLine('}', indent);

    }
    emitCSharpService(builder: CodeBuilder, indent: number) {
        builder.appendLine(`public abstract class ${this.Name}: WebSocketServiceBase`, indent);
        builder.appendLine(`{`, indent);
        this.emitCSharpServiceConstructor(builder, indent + 1);
        for (let method of this.Methods) {
            this.emitCSharpServiceMethod(builder, indent + 1, method);
        }
        this.emitCSharpServiceInvokeMethod(builder, indent + 1);
        builder.appendLine(`}`, indent);
    }
    emitCSharpServiceConstructor(builder: CodeBuilder, indent: number) {
        builder.appendLine(`public ${this.Name}()`, indent);
        builder.appendLine(`{`, indent);
        builder.appendLine(`__name = "${this.Name}";`, indent + 1);
        builder.appendLine(`}`, indent);
    }
    emitCSharpServiceMethod(builder: CodeBuilder, indent: number, method: Method) {
        builder.appendLine(`public abstract ${this.emitCSharpType(method.ReturnType, builder)} ${method.Name}(${this.emitCSharpParameters(method.Parameters, builder)});`, indent);
    }
    emitCSharpType(typeInstance: Type, builder: CodeBuilder) {
        return CodeGeneration.mapCSType(typeInstance, builder);
    }
    emitCSharpParameters(parameters: Parameter[], builder: CodeBuilder) {
        return parameters
            .map(parameter => `${this.emitCSharpType(parameter.Type, builder)} ${parameter.Name}`)
            .join(', ');
    }
    emitCSharpServiceInvokeMethod(builder: CodeBuilder, indent: number) {
        builder.appendLine(`public override BaseMessage __invoke(BaseMessage message)`);
        builder.appendLine(`{`, indent);
        let switchIndent = indent + 1;
        let caseIndent = switchIndent + 1;
        let contentIndent = caseIndent + 1;
        builder.appendLine(`switch (message.Method)`, switchIndent);
        builder.appendLine(`{`, switchIndent);
        for (let method of this.Methods) {
            builder.appendLine(`case "${method.Name}":`, caseIndent);
            builder.appendLine(`{`, caseIndent);
            for (let parameter of method.Parameters) {
                let parameterType = this.emitCSharpType(parameter.Type, builder);
                builder.appendLine(`${parameterType} ____${parameter.Name} = message.Payload.GetProperty<${parameterType}>("${parameter.Name}");`, contentIndent)
            }
            if (method.ReturnType.Reference === VoidType) {
                builder.appendLine(`break;`, contentIndent);
            } else {
                let parameterNames = method.Parameters
                    .map(parameter => `____${parameter.Name}`)
                    .join(', ');
                builder.appendLine(`return message.ReturnMessage(${method.Name}(${parameterNames}));`, contentIndent);
            }
            builder.appendLine(`}`, caseIndent);
        }
        builder.appendLine(`default: throw new NotImplementedException($"{message.Service}.{message.Method} is not implemented.");`, caseIndent);
        builder.appendLine(`}`, switchIndent);
        builder.appendLine(`}`, indent);
    }

    emitCSharpClientFile(rootDirectory: string) {
        // emit the UniRpcFiles
        
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

Namespace.prototype.emitServiceFiles = NamespaceEmitter.prototype.emitServiceFiles;
Namespace.prototype.emitClientFiles = NamespaceEmitter.prototype.emitClientFiles;