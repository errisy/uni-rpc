import {WebsocketService as $UniRpc_WebsocketService} from "../UniRpc/WebsocketService";
import {WebsocketServiceBase as $UniRpc_WebsocketServiceBase} from "../UniRpc/WebsocketServiceBase";
import {Message as $MyService_Message} from "./Message";
import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
@Injectable({
    providedIn: 'root'
})
export class DevService<Dog> extends $UniRpc_WebsocketServiceBase
{
    public constructor (private __websocketService: $UniRpc_WebsocketService)
    {
        super();
        this.__reflection = "MyService.DevService";
        this.__genericArguments = [];
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
    /** release resource */
    public Release<Cat>(/** the cat instance */ cat: Cat, dog: Dog): Observable<string> {
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
}