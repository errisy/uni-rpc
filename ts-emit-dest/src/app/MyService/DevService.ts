import {Message as $MyService_Message} from "../Message";
import {WebsocketService as $UniRpc_WebsocketService} from "../UniRpc/WebsocketService";
import {WebsocketServiceBase as $UniRpc_WebsocketServiceBase} from "../UniRpc/WebsocketServiceBase";
import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
@Injectable({
    providedIn: 'root'
})
export class DevService<Dog>
{
    public constructor (private __websocketService: $UniRpc_WebsocketService)
    {
        this.__reflection = "MyService.DevService";
        this.__genericArguments = [typeof(Dog).FullName];
    }
    public Send(message: $MyService_Message): Observable<boolean> {
        return this.__websocketService.send({
            Service: 'MyService.DevService',
            Method: 'Send',
            GenericArguments: [],
            Payload: {
                message: message
            }
        }).pipe(map(__result => {
            return __result.Payload as boolean;
        }));
    }
    public Get(): Observable<boolean> {
        return this.__websocketService.send({
            Service: 'MyService.DevService',
            Method: 'Get',
            GenericArguments: [],
            Payload: {
            }
        }).pipe(map(__result => {
            return __result.Payload as boolean;
        }));
    }
    public StoryCount(): Observable<number> {
        return this.__websocketService.send({
            Service: 'MyService.DevService',
            Method: 'StoryCount',
            GenericArguments: [],
            Payload: {
            }
        }).pipe(map(__result => {
            return __result.Payload as number;
        }));
    }
    public Test(): Observable<string> {
        return this.__websocketService.send({
            Service: 'MyService.DevService',
            Method: 'Test',
            GenericArguments: [],
            Payload: {
            }
        }).pipe(map(__result => {
            return __result.Payload as string;
        }));
    }
    public AB(my: number): Observable<number> {
        return this.__websocketService.send({
            Service: 'MyService.DevService',
            Method: 'AB',
            GenericArguments: [],
            Payload: {
                my: my
            }
        }).pipe(map(__result => {
            return __result.Payload as number;
        }));
    }
    public Gap(value: number, enabled: boolean): Observable<number[]> {
        return this.__websocketService.send({
            Service: 'MyService.DevService',
            Method: 'Gap',
            GenericArguments: [],
            Payload: {
                value: value,
                enabled: enabled
            }
        }).pipe(map(__result => {
            return __result.Payload as number[];
        }));
    }
    public Release<Cat>(cat: Cat, dog: Dog): Observable<string> {
        return this.__websocketService.send({
            Service: 'MyService.DevService',
            Method: 'Release',
            GenericArguments: [],
            Payload: {
                cat: cat,
                dog: dog
            }
        }).pipe(map(__result => {
            return __result.Payload as string;
        }));
    }
    public GetMessage(): Observable<$MyService_Message> {
        return this.__websocketService.send({
            Service: 'MyService.DevService',
            Method: 'GetMessage',
            GenericArguments: [],
            Payload: {
            }
        }).pipe(map(__result => {
            return __result.Payload as $MyService_Message;
        }));
    }
    public IncomingCall(): Observable<void> {
        return this.__websocketService.send({
            Service: 'MyService.DevService',
            Method: 'IncomingCall',
            GenericArguments: [],
            Payload: {
            }
        }).pipe(map(__result => {
            return __result.Payload as void;
        }));
    }
    public override BaseMessage __invoke(BaseMessage message)
    {
        switch (message.Method)
        {
            case "Send":
                {
                    $MyService_Message ____message = message.Payload.GetProperty<$MyService_Message>("message");
                    return message.ReturnMessage(Send(____message));
                }
            case "Get":
                {
                    return message.ReturnMessage(Get());
                }
            case "StoryCount":
                {
                    return message.ReturnMessage(StoryCount());
                }
            case "Test":
                {
                    return message.ReturnMessage(Test());
                }
            case "AB":
                {
                    number ____my = message.Payload.GetProperty<number>("my");
                    return message.ReturnMessage(AB(____my));
                }
            case "Gap":
                {
                    number ____value = message.Payload.GetProperty<number>("value");
                    boolean ____enabled = message.Payload.GetProperty<boolean>("enabled");
                    return message.ReturnMessage(Gap(____value, ____enabled));
                }
            case "Release":
                {
                    object ____cat = message.Payload.GetPropertyByReflection("cat");
                    Dog ____dog = message.Payload.GetProperty<Dog>("dog");
                    return message.ReturnMessage(Release(____cat, ____dog));
                }
            case "GetMessage":
                {
                    return message.ReturnMessage(GetMessage());
                }
            case "IncomingCall":
                {
                    IncomingCall();
                    break;
                }
        }
        throw new NotImplementedException($"{message.Service}.{message.Method} is not implemented.");
    }
}