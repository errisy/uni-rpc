import {WebsocketService as $UniRpc_WebsocketService} from "../UniRpc/WebsocketService";
import {WebsocketServiceBase as $UniRpc_WebsocketServiceBase} from "../UniRpc/WebsocketServiceBase";
import {Message as $MyService_Message} from "./Message";
export abstract class DevService<Dog> extends $UniRpc_WebsocketServiceBase
{
    public constructor (private __websocketService: $UniRpc_WebsocketService)
    {
        super();
        this.__reflection = "MyService.DevService";
        this.__genericArguments = [typeof(Dog).FullName];
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
}