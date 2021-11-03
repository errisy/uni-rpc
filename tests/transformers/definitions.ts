export interface ILocalNameResolver {
    Parent: ILocalNameResolver;
    resolve(fullname: string[]): Type;
    build(parent: ILocalNameResolver): void;
    link(): void;
}

export class Namespace implements ILocalNameResolver{
    Reflection: 'Namespace' = 'Namespace';
    Name: string;
    Fullname: string[];
    Namespaces: Namespace[] = [];
    Messages: Message[] = [];
    Services: Service[] = [];
    Children: Map<string, Namespace | Message | Service | Type> = new Map();
    Parent: ILocalNameResolver;
    get NamespaceName(): string {
        return this.Fullname.join('.');
    }
    isSameNamespace(fullname: string[]): boolean {
        if (fullname.length != this.Fullname.length) return false;
        for (let i = 0; i < fullname.length; i++) {
            if (fullname[i] != this.Fullname[i]) return false;
        }
        return true;
    }
    resolve(fullname: string[]): Type {
        if (fullname.length == 1) {
            let name = fullname[0];
            if (this.Children.has(name) && this.Children.get(name).Reflection == 'Message') {
                return (this.Children.get(name) as any as Message).Type;
            } else if (this.Parent) {
                return this.Parent.resolve(fullname);
            } else {
                throw `Unresolved Symbol Name "${fullname.join('.')}"`;
            }
        } else if (this.isSameNamespace(fullname)) {
            let name = fullname[fullname.length - 1];
            if (this.Children.has(name) && this.Children.get(name).Reflection == 'Message') {
                return (this.Children.get(name) as any as Message).Type;
            } else {
                throw `Unresolved Symbol Name "${fullname.join('.')}"`;
            }
        }
    }
    build(parent: ILocalNameResolver) {
        this.Parent = parent;
        for (let child of this.Children.values()) {
            (child as any as ILocalNameResolver).build(this);
        }
    }
    link() {
        for (let child of this.Children.values()) {
            (child as any as ILocalNameResolver).link();
        }
    }
    addService(nsName: string[], name: string): Service {
        let service = new Service();
        service.Namespace = nsName;
        service.Name = name;
        service.Fullname = [...nsName, name];
        this.Services.push(service);
        this.Children.set(name, service);
        return service;
    }
    addMessage(nsName: string[], name: string): Message {
        let message = new Message();
        message.Namespace = nsName;
        message.Name = name;
        message.Fullname = [...nsName, name];
        this.Messages.push(message);
        this.Children.set(name, message);
        return message;
    }
}

export class Message implements ILocalNameResolver {
    Reflection: 'Message' = 'Message';
    Name: string;
    Namespace: string[];
    Fullname: string[];
    Properties: Property[] = [];
    IsGeneric: boolean;
    GenericArguments: Type[] = [];
    Type: Type;
    Children: Map<string, Type> = new Map();
    Parent: ILocalNameResolver;
    buildChildren() {
        if (this.IsGeneric) {
            for (let genericArgument of this.GenericArguments) {
                this.Children.set(genericArgument.Name,  genericArgument);
            }
        }
    }
    resolve(fullname: string[]): Type {
        if (fullname.length == 1 && this.Children.has(fullname[0])) {
            // it is generic parameter type
            return this.Children.get(fullname[0]);
        } else {
            return this.Parent.resolve(fullname);
        }
    }
    build(parent: ILocalNameResolver) {
        this.Parent = parent;
        for (let child of this.Children.values()) {
            (child as any as ILocalNameResolver).build(this);
        }
    }
    link() {
        for (let child of this.Children.values()) {
            (child as any as ILocalNameResolver).link();
        }
    }
}

export class Property implements ILocalNameResolver {
    Reflection: 'Property' = 'Property';
    Name: string;
    Type: Type;
    Parent: ILocalNameResolver;
    resolve(fullname: string[]): Type {
        return this.Parent.resolve(fullname);
    }
    build(parent: ILocalNameResolver) {
        this.Parent = parent;
        this.Type.build(this);
    }
    link() {
        this.Type.link
    }
}

export class Service implements ILocalNameResolver{
    Reflection: 'Service' = 'Service';
    Name: string;
    Namespace: string[];
    Fullname: string[];
    Methods: Method[] = [];
    IsGeneric: boolean;
    GenericArguments: Type[] = [];
    Children: Map<string, Type> = new Map();
    Parent: ILocalNameResolver;
    buildChildren() {
        if (this.IsGeneric) {
            for (let genericArgument of this.GenericArguments) {
                this.Children.set(genericArgument.Name,  genericArgument);
            }
        }
    }
    resolve(fullname: string[]): Type {
        if (fullname.length == 1 && this.Children.has(fullname[0])) {
            // it is generic parameter type
            return this.Children.get(fullname[0]);
        } else {
            return this.Parent.resolve(fullname);
        }
    }
    build(parent: ILocalNameResolver) {
        this.Parent = parent;
        for (let child of this.Children.values()) {
            (child as any as ILocalNameResolver).build(this);
        }
    }
    link() {
        for (let child of this.Children.values()) {
            (child as any as ILocalNameResolver).link();
        }
    }
}

export class Method implements ILocalNameResolver {
    Reflection: 'Method' = 'Method';
    Name: string;
    Parameters: Parameter[];
    ReturnType: Type;
    IsGeneric: boolean;
    GenericArguments: Type[] = [];
    Children: Map<string, Type> = new Map();
    Parent: ILocalNameResolver;
    buildChildren() {
        if (this.IsGeneric) {
            for (let genericArgument of this.GenericArguments) {
                this.Children.set(genericArgument.Name,  genericArgument);
            }
        }
    }
    resolve(fullname: string[]): Type {
        if (fullname.length == 1 && this.Children.has(fullname[0])) {
            // it is generic parameter type
            return this.Children.get(fullname[0]);
        } else {
            return this.Parent.resolve(fullname);
        }
    }
    build(parent: ILocalNameResolver) {
        this.Parent = parent;
        for (let child of this.Children.values()) {
            (child as any as ILocalNameResolver).build(this);
        }
    }
    link() {
        for (let child of this.Children.values()) {
            (child as any as ILocalNameResolver).link();
        }
    }
}

export class Parameter implements ILocalNameResolver{
    Reflection: 'Argument' = 'Argument';
    Name: string;
    Type: Type;
    Parent: ILocalNameResolver;
    resolve(fullname: string[]): Type {
        return this.Parent.resolve(fullname);
    }
    build(parent: ILocalNameResolver) {
        this.Parent = parent;
        for (let child of this.Children.values()) {
            (child as any as ILocalNameResolver).build(this);
        }
    }
    link() {
        for (let child of this.Children.values()) {
            (child as any as ILocalNameResolver).link();
        }
    }
}

export class Type implements ILocalNameResolver{
    Reflection: 'Type' = 'Type';
    Name: string;
    SystemType?: string;
    FullName: string[];
    MessageReference: Message;
    GenericDefinition?: Type;
    GenericArguments?: Type[];
    IsGeneric: boolean = false;
    IsGenericDefinition: boolean = false;
    IsGenericPlaceholder: boolean = false;
    Reference: Type;
    Parent: ILocalNameResolver;
    constructor(name?: string, systemType?: string, isGenericDefinition?: boolean) {
        this.Name = name;
        this.SystemType = systemType;
        this.IsGenericDefinition = isGenericDefinition;
    }
    resolve(fullname: string[]): Type {

    }
    build(parent: ILocalNameResolver) {
        this.Parent = parent;
        if (this.IsGeneric) {
            this.GenericDefinition.build(this);
            for (let genericArgument of this.GenericArguments) {
                genericArgument.build(this);
            }
        }
    }
    link() {
        
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