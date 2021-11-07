import { Namespace, Service, Message, Method, Property, Parameter, Type } from './definitions';
import { SourceFileResovler } from './resolvers';
import { RPC, Target } from './rpc-configuration';
import { CodeBuilder } from './code-builder';

export class CSharpBuilder {
    
    constructor (private resolver: SourceFileResovler) {

    }
    public emit(rpc: RPC) {
        
    }
}

declare module './definitions' {
    export interface Service {
        emitFile(rootDirectory: string): void;
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

    export function mapCSType(typeInstance: Type, builder: CodeBuilder) {
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




class ServiceEmitter extends Service {
    emitSeriveFile(rootDirectory: string) {
        let filename = `${rootDirectory}/${this.Fullname.join('/')}.cs`;
        let builder: CodeBuilder = new CodeBuilder();
        
    }
    emitClientFile(rootDirectory: string) {
        
    }
}

Service.prototype.emitFile = ServiceEmitter.prototype.emitFile;