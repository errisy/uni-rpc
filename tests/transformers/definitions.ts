

export class Namespace {
    Name: string;
    Namespaces: Namespace[] = [];
    Messages: Message[] = [];
    Services: Service[] = [];
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
    ReturnType: string;
}

export class Argument{
    Name: string;
    Type: Type;
}

export class Type {
    Name: string;
    FullName: string;
    GenericArguments: Type[] = [];
}