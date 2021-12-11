import {WebsocketService as $UniRpc_WebsocketService} from "../UniRpc/WebsocketService";
import {WebsocketServiceBase as $UniRpc_WebsocketServiceBase} from "../UniRpc/WebsocketServiceBase";
import {TestMessage as $MyService_TestMessage} from "./TestMessage";
import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
@Injectable({
    providedIn: 'root'
})
export class TestService extends $UniRpc_WebsocketServiceBase
{
    public constructor (private __websocketService: $UniRpc_WebsocketService)
    {
        super();
        this.__reflection = "MyService.TestService";
        this.__genericArguments = [];
    }
    public test(name: string, value: number, msg: $MyService_TestMessage): Observable<void> {
        return this.__websocketService.send({
            Service: 'MyService.TestService',
            Method: 'test',
            GenericArguments: [],
            Payload: {
                name: name,
                value: value,
                msg: msg
            }
        }).pipe(map(__result => {
            return __result.Payload as void;
        }));
    }
}