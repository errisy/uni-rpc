

export class Namespace {
    Name: string;
    Namespaces: Namespace[] = [];
    Messages: Message[] = [];
    Services: Service[] = [];
    Children: Map<string, Message | Service> = new Map();
    addService(nsName: string, name: string): Service {
        let service = new Service();
        service.Namespace = nsName;
        service.Name = name;
        this.Services.push(service);
        this.Children.set(name, service);
        return service;
    }
    addMessage(nsName: string, name: string): Message {
        let message = new Message();
        message.Namespace = nsName;
        message.Name = name;
        this.Messages.push(message);
        this.Children.set(name, message);
        return message;
    }
}

export class Message {
    Name: string;
    Namespace: string;
    Properties: Property[] = [];
}

export class Property {
    Name: string;
    Type: Type;
}

export class Service {
    Name: string;
    Namespace: string;
    Methods: Method[] = [];
}

export class Method {
    Name: string;
    Arguments: Argument[];
    ReturnType: Type;
}

export class Argument{
    Name: string;
    Type: Type;
}

export class Type {
    Name: string;
    SystemType: string;
    FullName: string[];
    GenericDefinition: Type;
    GenericArguments: Type[] = [];
    IsGeneric: boolean = false;
    IsGenericDefinition: boolean = false;
    constructor(name?: string, systemType?: string, isGenericDefinition?: boolean) {
        this.Name = name;
        this.SystemType = systemType;
        this.IsGenericDefinition = isGenericDefinition;
    }
}

export const BooleanType = new Type('boolean', 'boolean');
export const StringType = new Type('string', 'string');
export const FloatType = new Type('float', 'float');
export const DoubleType = new Type('double', 'double');
export const IntegerType = new Type('integer', 'integer');
export const LongType = new Type('long', 'long');
export const BytesType = new Type('bytes', 'bytes');
export const ListType = new Type('List', 'List', true);
export const DictType = new Type('Dict', 'Dict', true);
export const ArrayType = new Type('Array', 'Array', true);