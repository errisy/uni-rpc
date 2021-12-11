export interface ILocalNameResolver {
    Reflection: 'SourceFileResovler' | 'Namespace' | 'Service' | 'Message' | 'ServiceInterface' | 'MessageInterface' | 'Method' | 'Property' | 'Argument' | 'Type';
    Parent: ILocalNameResolver;
    resolve(fullname: string[]): Type;
    build(parent: ILocalNameResolver): void;
    link(): void;
}

const CustomTypes = ['Message', 'MessageInterface', 'Service', 'ServiceInterface'];
type CustomType = Message | MessageInterface | Service | ServiceInterface;
export class Namespace implements ILocalNameResolver{
    Reflection: 'Namespace' = 'Namespace';
    Name: string;
    Fullname: string[];
    Namespaces: Map<string, Namespace> = new Map();
    Messages: Message[] = [];
    Services: Service[] = [];
    MessageInterfaces: MessageInterface[] = [];
    ServiceInterfaces: ServiceInterface[] = [];
    Children: Map<string, Namespace | Message | Service | MessageInterface | ServiceInterface | Type> = new Map();
    Parent: ILocalNameResolver;
    get NamespaceName(): string {
        return this.Fullname.join('.');
    }
    /** The fullname may not be the full namespace, it just need to match the ending ones. */
    matchNamespace(fullname: string[]): boolean {
        let namespaceLayerCount = this.Fullname.length, nameLayerCount = fullname.length - 1;
        let maxLayerCount = Math.min(nameLayerCount, namespaceLayerCount);
        for (let i = 0; i < maxLayerCount; i++) {
            if (this.Fullname[namespaceLayerCount - 1 - i] != fullname[nameLayerCount - 1 - i]) {
                return false;
            }
        }
        return true;
    }
    // find Partially matched indices
    *findMatchIndices(fullname: string[]): IterableIterator<number> {
        if (this.Children.has(fullname[0])) {
            yield -1;
        }
        for (let index = 0; index < fullname.length - 1; ++index) {
            if (fullname[index] == this.Name) {
                yield index;
            }
        }
    }
    tryMatchParent(parentName: string[]) {
        if (parentName.length == 0) return true;
        let name = parentName.pop(); // Remove and get the last section for matching the current
        if (this.Name != name) return false;
        if (parentName.length == 0) return true;
        if (!this.Parent) return false; // When this is the top level namespace.
        return (this.Parent as Namespace).tryMatchParent(parentName); // When there is parent namespace to match;
    }
    topdownResolve(fullname: string[]): Type | undefined {
        if (fullname.length == 1 && this.Children.has(fullname[0]) && CustomTypes.includes(this.Children.get(fullname[0]).Reflection)) {
            return (this.Children.get(fullname[0]) as any as CustomType).Type;
        } else if (fullname.length > 1 && this.Children.has(fullname[0]) && this.Children.get(fullname[0]).Reflection == 'Namespace') {
            return (this.Children.get(fullname[0]) as Namespace).topdownResolve(fullname.slice(1));
        }
        return undefined;
    }
    resolve(fullname: string[]): Type {
        if (fullname.length == 1) {
            let name = fullname[0];
            if (this.Children.has(name) && CustomTypes.includes(this.Children.get(name).Reflection)) {
                return (this.Children.get(fullname[0]) as any as CustomType).Type;
            }
        } else {
            for (let index of this.findMatchIndices(fullname)) {
                // Before matching descendents, we have to match ancestors first.
                if (index < 0 || this.tryMatchParent(fullname.slice(0, index))) {
                    let resolved: Type = undefined;
                    if (resolved = this.topdownResolve(fullname.slice(index + 1))) {
                        return resolved;
                    }
                }
            }
        }
        // If there is parent, try match parent.
        if (this.Parent) {
            return this.Parent.resolve(fullname);
        } else {
            throw `Unresolved Type "${fullname.join('.')}."`;
        }
    }
    buildChildren() {
        for (let key of this.Namespaces.keys()) {
            let namespaceInstance = this.Namespaces.get(key);
            this.Children.set(namespaceInstance.Name, namespaceInstance);
        }
    }
    build(parent: ILocalNameResolver) {
        this.Parent = parent;
        this.buildChildren();
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
    addServiceInterface(nsName: string[], name: string): ServiceInterface {
        let service = new ServiceInterface();
        service.Namespace = nsName;
        service.Name = name;
        service.Fullname = [...nsName, name];
        this.ServiceInterfaces.push(service);
        this.Children.set(name, service);
        return service;
    }
    addMessageInterface(nsName: string[], name: string): MessageInterface {
        let message = new MessageInterface();
        message.Namespace = nsName;
        message.Name = name;
        message.Fullname = [...nsName, name];
        this.MessageInterfaces.push(message);
        this.Children.set(name, message);
        return message;
    }
}

export class Enum {
    Name: string;
    Namespace: string[];
    Fullname: string[];
    Members: string[];
    Type: Type;
}

export class Message implements ILocalNameResolver {
    Base: Type;
    Implementations: Type[];
    Reflection: 'Message' = 'Message';
    Comments?: string;
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
        this.Children.set(this.Name, this.Type);
        if (this.IsGeneric) {
            // The Message type itself can be a valid type
            for (let genericArgument of this.GenericArguments) {
                genericArgument.IsClassGenericPlaceholder = true;
                this.Children.set(genericArgument.Name,  genericArgument);
            }
        }
    }
    resolve(fullname: string[]): Type {
        if (fullname.length == 1 && this.Children.has(fullname[0])) {
            // it is generic parameter type
            return this.Children.get(fullname[0]);
        }
        return this.Parent.resolve(fullname);
    }
    build(parent: ILocalNameResolver) {
        this.Parent = parent;
        if (this.Base) {
            this.Base.build(this);
        }
        if (Array.isArray(this.Implementations)) {
            for (let implementation of this.Implementations) {
                implementation.build(this);
            }
        }
        this.buildChildren();
        for (let property of this.Properties) {
            property.build(this);
        }
    }
    link() {
        if (this.Base) {
            this.Base.link();
        }
        if (Array.isArray(this.Implementations)) {
            for (let implementation of this.Implementations) {
                implementation.link();
            }
        }
        for (let property of this.Properties) {
            property.link();
        }
    }
}

export class MessageInterface implements ILocalNameResolver {
    Base: Type;
    Reflection: 'MessageInterface' = 'MessageInterface';
    Comments?: string;
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
        this.Children.set(this.Name, this.Type);
        if (this.IsGeneric) {
            // The Message type itself can be a valid type
            for (let genericArgument of this.GenericArguments) {
                genericArgument.IsClassGenericPlaceholder = true;
                this.Children.set(genericArgument.Name,  genericArgument);
            }
        }
    }
    resolve(fullname: string[]): Type {
        if (fullname.length == 1 && this.Children.has(fullname[0])) {
            // it is generic parameter type
            return this.Children.get(fullname[0]);
        }
        return this.Parent.resolve(fullname);
    }
    build(parent: ILocalNameResolver) {
        this.Parent = parent;
        if (this.Base) {
            this.Base.build(this);
        }
        this.buildChildren();
        for (let property of this.Properties) {
            property.build(this);
        }
    }
    link() {
        if (this.Base) {
            this.Base.link();
        }
        for (let property of this.Properties) {
            property.link();
        }
    }
}

export class Property implements ILocalNameResolver {
    Reflection: 'Property' = 'Property';
    Comments?: string;
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
        this.Type.link();
    }
}

export class Service implements ILocalNameResolver{
    Base: Type;
    Implementations: Type[];
    Reflection: 'Service' = 'Service';
    Comments?: string;
    Type: Type;
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
                genericArgument.IsClassGenericPlaceholder = true;
                this.Children.set(genericArgument.Name,  genericArgument);
            }
        }
    }
    resolve(fullname: string[]): Type {
        if (this.IsGeneric && fullname.length == 1 && this.Children.has(fullname[0])) {
            return this.Children.get(fullname[0]);
        }
        return this.Parent.resolve(fullname);
    }
    build(parent: ILocalNameResolver) {
        this.Parent = parent;
        if (this.Base) {
            this.Base.build(this);
        }
        if (Array.isArray(this.Implementations)) {
            for (let implementation of this.Implementations) {
                implementation.build(this);
            }
        }
        this.buildChildren();
        for (let method of this.Methods) {
            method.build(this);
        }
    }
    link() {
        if (this.Base) {
            this.Base.link();
        }
        if (Array.isArray(this.Implementations)) {
            for (let implementation of this.Implementations) {
                implementation.link();
            }
        }
        for (let method of this.Methods) {
            method.link();
        }
    }
}

export class ServiceInterface implements ILocalNameResolver {
    Base: Type;
    Reflection: 'ServiceInterface' = 'ServiceInterface';
    Comments?: string;
    Type: Type;
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
                genericArgument.IsClassGenericPlaceholder = true;
                this.Children.set(genericArgument.Name,  genericArgument);
            }
        }
    }
    resolve(fullname: string[]): Type {
        if (this.IsGeneric && fullname.length == 1 && this.Children.has(fullname[0])) {
            return this.Children.get(fullname[0]);
        }
        return this.Parent.resolve(fullname);
    }
    build(parent: ILocalNameResolver) {
        this.Parent = parent;
        if (this.Base) {
            this.Base.build(this);
        }
        this.buildChildren();
        for (let method of this.Methods) {
            method.build(this);
        }
    }
    link() {
        if (this.Base) {
            this.Base.link();
        }
        for (let method of this.Methods) {
            method.link();
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
    Comments?: string;
    buildChildren() {
        if (this.IsGeneric) {
            for (let genericArgument of this.GenericArguments) {
                this.Children.set(genericArgument.Name,  genericArgument);
            }
        }
    }
    resolve(fullname: string[]): Type {
        // If the Method is generic, it can resolve generic argument type
        if (this.IsGeneric) {
            // Method can only resolve generic Argument Type by name.
            // try print all children
            if (fullname.length == 1 && this.Children.has(fullname[0])) {
                // it is generic parameter type
                return this.Children.get(fullname[0]);
            } else {
                return this.Parent.resolve(fullname);
            }
        } else {
            return this.Parent.resolve(fullname);
        }

    }
    build(parent: ILocalNameResolver) {
        this.Parent = parent;
        this.buildChildren();
        for (let parameter of this.Parameters) {
            parameter.build(this);
        }
        this.ReturnType.build(this);
    }
    link() {
        for (let genericArgument of this.GenericArguments) {
            genericArgument.Parent = this;
        }
        for (let parameter of this.Parameters) {
            parameter.link();
        }
        this.ReturnType.link();
    }
}

export class Parameter implements ILocalNameResolver{
    Reflection: 'Argument' = 'Argument';
    Name: string;
    Type: Type;
    Parent: ILocalNameResolver;
    Comments?: string;
    resolve(fullname: string[]): Type {
        // Only generic argument can resolve type. This is the function parameter.
        return this.Parent.resolve(fullname);
    }
    build(parent: ILocalNameResolver) {
        this.Parent = parent;
        this.Type.build(this);
    }
    link() {
        this.Type.link();
    }
}

export class Type implements ILocalNameResolver{
    Reflection: 'Type' = 'Type';
    Name: string;
    SystemType?: string;
    FullName: string[];
    ReferenceType: 'SystemType' | 'Service' | 'Message' | 'ServiceInterface' | 'MessageInterface';
    ServiceReference?: Service;
    MessageReference?: Message;
    MessageInterfaceReference?: MessageInterface;
    ServiceInterfaceReference?: ServiceInterface;
    GenericDefinition?: Type;
    GenericArguments?: Type[];
    IsGeneric: boolean = false;
    IsGenericDefinition: boolean = false;
    IsGenericPlaceholder: boolean = false;
    IsClassGenericPlaceholder: boolean = false;
    Reference: Type;
    Parent: ILocalNameResolver;
    constructor(name?: string, systemType?: string, isGenericDefinition?: boolean) {
        this.Name = name;
        // The root namespace
        this.FullName = [name];
        this.SystemType = systemType;
        this.IsGenericDefinition = isGenericDefinition;
    }
    resolve(fullname: string[]): Type {
        let resolved = this.Parent.resolve(fullname);
        if (!resolved) {
            console.log('Not Resolved Type:', this);
        }
        return resolved;
    }
    build(parent: ILocalNameResolver) {
        this.Parent = parent;
        if (this.IsGeneric) {
            if (!this.GenericDefinition) {
                console.log('GenericDefinition Not Defined:', this);
            }
            this.GenericDefinition.build(this);
            for (let genericArgument of this.GenericArguments) {
                genericArgument.build(this);
            }
        }
    }
    link() {
        if (this.IsGeneric) {
            // In the case of generic type, we need resolve the generic definition and generic arguments separately.
            this.GenericDefinition.link();
            for (let genericArugment of this.GenericArguments) {
                genericArugment.link();
            }
        } else {
            // In the case of non-generic type, we only need to resolve to the definition
            try{
                this.Reference = this.resolve(this.FullName);
                if (this.Reference.IsGenericPlaceholder) this.IsGenericPlaceholder = true;
            } catch (ex) {
                console.log('Unresolved Type:', this);
                throw `Can't not resolve type ${this.FullName.join('.')}`;
            }
            
        }
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
export const PromiseType = new Type('Promise', 'Promise', true);
export const VoidType = new Type('void', 'void');
export const AnyType = new Type('any', 'any');