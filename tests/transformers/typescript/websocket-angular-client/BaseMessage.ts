export interface BaseMessage {
    Id?: string;
    Service: string;
    Method: string;
    GenericArguments: string[];
    Payload: any;
}