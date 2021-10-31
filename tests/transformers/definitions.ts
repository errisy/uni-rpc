

class Namespace {
    Namespaces: Namespace[] = [];
    Messages: Message[] = [];
    Services: Service[] = [];
}

class Message {
    Properties: Property[];
}

class Property {
    Name: string;
    Type: string;
}
class Service {

}