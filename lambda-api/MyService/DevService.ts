import {BaseMessage as $UniRpc_BaseMessage} from "../UniRpc/BaseMessage";
import {ReturnMessage as $UniRpc_ReturnMessage} from "../UniRpc/ReturnMessage";
import {WebsocketServiceBase as $UniRpc_WebsocketServiceBase} from "../UniRpc/WebsocketServiceBase";
import {Message as $MyService_Message} from "./Message";
export abstract class DevService<Dog> extends $UniRpc_WebsocketServiceBase
{
    public constructor () {
        super();
        this.__reflection = "MyService.DevService";
    }
    public abstract Send(message: $MyService_Message): Promise<boolean>;
    public abstract Get(): Promise<boolean>;
    public abstract StoryCount(): Promise<number>;
    public abstract Test(): Promise<string>;
    public abstract AB(my: number): Promise<number>;
    public abstract Gap(value: number, enabled: boolean): Promise<number[]>;
    /** release resource */
    public abstract Release<Cat>(/** the cat instance */ cat: Cat, dog: Dog): Promise<string>;
    public abstract GetMessage(): Promise<$MyService_Message>;
    public abstract IncomingCall(): Promise<void>;
    public async __invoke(message: $UniRpc_BaseMessage): Promise<$UniRpc_BaseMessage> {
        switch (message.Method)
        {
            case "Send":
                {
                    let ____message: $MyService_Message = message.Payload['message'];
                    return $UniRpc_ReturnMessage(message, await this.Send(____message));
                }
            case "Get":
                {
                    return $UniRpc_ReturnMessage(message, await this.Get());
                }
            case "StoryCount":
                {
                    return $UniRpc_ReturnMessage(message, await this.StoryCount());
                }
            case "Test":
                {
                    return $UniRpc_ReturnMessage(message, await this.Test());
                }
            case "AB":
                {
                    let ____my: number = message.Payload['my'];
                    return $UniRpc_ReturnMessage(message, await this.AB(____my));
                }
            case "Gap":
                {
                    let ____value: number = message.Payload['value'];
                    let ____enabled: boolean = message.Payload['enabled'];
                    return $UniRpc_ReturnMessage(message, await this.Gap(____value, ____enabled));
                }
            case "Release":
                {
                    let ____cat: any = message.Payload['cat'];
                    let ____dog: Dog = message.Payload['dog'];
                    return $UniRpc_ReturnMessage(message, await this.Release(____cat, ____dog));
                }
            case "GetMessage":
                {
                    return $UniRpc_ReturnMessage(message, await this.GetMessage());
                }
            case "IncomingCall":
                {
                    await this.IncomingCall();
                    break;
                }
        }
        throw `${message.Service}.${message.Method} is not defined.`;
    }
}