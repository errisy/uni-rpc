import { BaseMessage } from "./BaseMessage";

export function ReturnMessage(message: BaseMessage, value: any): BaseMessage {
    return {
        Id: message.Id,
        Service: message.Service,
        Method: message.Method,
        GenericArguments: message.GenericArguments,
        Payload: value,
        Success: true
    };
}