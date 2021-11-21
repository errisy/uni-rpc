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
        if (typeof target.cs == 'string' && target.type == 'websocket-service') {
            let rootDirectory = ResolvePath(target.cs);
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
        // Remove Dir UniRpc
        let destination = path.normalize(path.join(rootDirectory, 'UniRpc'));
        console.log('Remove:', destination);
        Remove(destination);
        //
        MakeDirectories(destination);
        CopyDirectory('./transformers/csharp/websocket-service', destination);
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
    TypeMappings.set('Promise', 'System.Threading.Tasks.Task');

    export function mapType(typeInstance: Type, builder: CodeBuilder): string {
        if (typeInstance.IsGenericPlaceholder) {
            return typeInstance.Name;
        } else if (typeInstance.IsGeneric) {
            if (typeInstance.GenericDefinition.Reference.SystemType && typeInstance.GenericDefinition.Reference.SystemType == 'Array') {
                // This is the special case for array.
                let arrayType = typeInstance.GenericArguments[0];
                return `${mapType(arrayType, builder)}[]`;
            } else {
                return `${mapType(typeInstance.GenericDefinition, builder)}<${typeInstance.GenericArguments.map(arg => mapType(arg, builder)).join(', ')}>`;
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
            } else if (typeInstance.Reference.ServiceReference) {
                return typeInstance.Reference.ServiceReference.Fullname.join('.');
            } else if (typeInstance.Reference.MessageInterfaceReference) {
                return typeInstance.Reference.MessageInterfaceReference.Fullname.join('.');
            } else if (typeInstance.Reference.ServiceInterfaceReference) {
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

    function importBuilder(imports: Set<string>, hierarchicalImports: Map<string, Map<string, string>>) {
        let importNamespaces: string[] = [];
        for (let importNs of imports) {
            importNamespaces.push(`using ${importNs};`);
        }
        importNamespaces = importNamespaces.sort();
        return importNamespaces.join('\r\n');
    }

    function emitComments(builder: CodeBuilder, indent: number, comments?: string, method?: Method) {
        if (typeof comments != 'string') return;
        builder.appendLine(`/// <summary>`, indent);
        comments.split('\n')
            .map(line => line.replace(/^\s*/ig, ''))
            .map(line => line.replace(/\s*$/ig, ''))
            .map(line => `/// ${line}`)
            .forEach(line => {
                builder.appendLine(line, indent);
            });
        if (method && Array.isArray(method.Parameters)) {
            for (let parameter of method.Parameters) {
                if (parameter.Comments) {
                    builder.appendLine(`/// <param name="${parameter.Name}">${parameter.Comments}</param>`, indent)
                }
            }
        }
        builder.appendLine(`/// </summary>`, indent);
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
            let filename = path.join(rootDirectory, ...this.instance.Namespace, this.instance.Name + '.cs');
            let builder: CodeBuilder = new CodeBuilder(importBuilder);
            let indent = 0;
            builder.appendLine(`namespace ${this.instance.Namespace.join('.')}`, indent);
            builder.appendLine('{', indent);
            this.emitService(builder, indent + 1);
            builder.appendLine('}', indent);
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
            emitComments(builder, indent, this.instance.Comments);
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
                builder.appendLine(`public abstract class ${this.instance.Name}<${genericArugments}>${heritage}`, indent);
            } else {
                builder.appendLine(`public abstract class ${this.instance.Name}${heritage}`, indent);
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
            emitComments(builder, indent, method.Comments, method);
            if (method.IsGeneric) {
                let genericArugments = method.GenericArguments
                    .map(arg => this.emitType(arg, builder))
                    .join(', ');
                    builder.appendLine(`public abstract System.Threading.Tasks.Task<${this.emitType(method.ReturnType, builder)}> ${method.Name}<${genericArugments}>(${this.emitMethodParameters(method.Parameters, builder)});`, indent);
            } else {
                builder.appendLine(`public abstract System.Threading.Tasks.Task<${this.emitType(method.ReturnType, builder)}> ${method.Name}(${this.emitMethodParameters(method.Parameters, builder)});`, indent);
            }
        }
        emitType(typeInstance: Type, builder: CodeBuilder) {
            return CodeGeneration.mapType(typeInstance, builder);
        }
        emitMethodParameters(parameters: Parameter[], builder: CodeBuilder) {
            return parameters
                .map(parameter => `${this.emitType(parameter.Type, builder)} ${parameter.Name}`)
                .join(', ');
        }
        emitServiceInvokeMethod(builder: CodeBuilder, indent: number) {
            builder.appendLine(`public override async System.Threading.Tasks.Task<BaseMessage> __invoke(BaseMessage message)`, indent);
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
                    builder.appendLine(`return message.ReturnMessage(await ${method.Name}(${parameterNames}));`, contentIndent);
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
            let filename = path.join(rootDirectory, ...this.instance.Namespace, this.instance.Name + '.cs');
            let builder: CodeBuilder = new CodeBuilder(importBuilder);
            let indent = 0;
            builder.appendLine(`namespace ${this.instance.Namespace.join('.')}`, indent);
            builder.appendLine('{', indent);
            this.emitMessage(builder, indent + 1);
            builder.appendLine('}', indent);
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
            emitComments(builder, indent, this.instance.Comments);
            let heritage = this.emitHeritage(builder);
            if (this.instance.IsGeneric) {
                let genericArugments = this.instance.GenericArguments
                    .map(arg => this.emitType(arg, builder))
                    .join(', ');
                builder.appendLine(`public class ${this.instance.Name} <${genericArugments}>${heritage}`, indent);
            } else {
                builder.appendLine(`public class ${this.instance.Name}${heritage}`, indent);
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
            emitComments(builder, indent, property.Comments);
            builder.appendLine(`public ${this.emitType(property.Type, builder)} ${property.Name} { get; set; }`, indent);
        }
        emitType(typeInstance: Type, builder: CodeBuilder) {
            return CodeGeneration.mapType(typeInstance, builder);
        }
    }

    class ServiceInterfaceEmitter {
        constructor(private instance: ServiceInterface) {}
        emitFile(rootDirectory: string) {
            let filename = path.join(rootDirectory, ...this.instance.Namespace, this.instance.Name + '.cs');
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
            emitComments(builder, indent, this.instance.Comments);
            let heritage = this.emitHeritage(builder);
            if (this.instance.IsGeneric) {
                let genericArugments = this.instance.GenericArguments
                    .map(arg => this.emitType(arg, builder))
                    .join(', ');
                builder.appendLine(`public interface ${this.instance.Name}<${genericArugments}>${heritage}`, indent);
            } else {
                builder.appendLine(`public interface ${this.instance.Name}${heritage}`, indent);
            }
            builder.appendLine(`{`, indent);
            for (let method of this.instance.Methods) {
                this.emitServiceMethod(builder, indent + 1, method);
            }
            builder.appendLine(`}`, indent);
        }
        emitServiceMethod(builder: CodeBuilder, indent: number, method: Method) {
            emitComments(builder, indent, method.Comments, method);
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
            return CodeGeneration.mapType(typeInstance, builder);
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
            let filename = path.join(rootDirectory, ...this.instance.Namespace, this.instance.Name + '.cs');
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
                builder.appendLine(`public interface ${this.instance.Name} <${genericArugments}>${heritage}`, indent);
            } else {
                builder.appendLine(`public interface ${this.instance.Name}${heritage}`, indent);
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
            builder.appendLine(`public ${this.emitType(property.Type, builder)} ${property.Name} { get; set; }`, indent);
        }
        emitType(typeInstance: Type, builder: CodeBuilder) {
            return CodeGeneration.mapType(typeInstance, builder);
        }
    }
}