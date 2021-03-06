import {WebsocketService as $UniRpc_WebsocketService} from "../UniRpc/WebsocketService";
import {WebsocketServiceBase as $UniRpc_WebsocketServiceBase} from "../UniRpc/WebsocketServiceBase";
import {IMXService as $MyService_IMXService} from "./IMXService";
import {IUXService as $MyService_IUXService} from "./IUXService";
import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
@Injectable({
    providedIn: 'root'
})
export class MXU extends $UniRpc_WebsocketServiceBase implements $MyService_IMXService, $MyService_IUXService
{
    public constructor (private __websocketService: $UniRpc_WebsocketService)
    {
        super();
        this.__reflection = "MyService.MXU";
        this.__genericArguments = [];
    }
    public testJob(): Observable<boolean> {
        return this.__websocketService.send({
            Service: 'MyService.MXU',
            Method: 'testJob',
            GenericArguments: [],
            Payload: {
            }
        }).pipe(map(__result => {
            return __result.Payload as boolean;
        }));
    }
    /**
     * comment 2 is not
     * just one line
     */
    public resolve(): Observable<void> {
        return this.__websocketService.send({
            Service: 'MyService.MXU',
            Method: 'resolve',
            GenericArguments: [],
            Payload: {
            }
        }).pipe(map(__result => {
            return __result.Payload as void;
        }));
    }
    public test(): Observable<Promise<string>> {
        return this.__websocketService.send({
            Service: 'MyService.MXU',
            Method: 'test',
            GenericArguments: [],
            Payload: {
            }
        }).pipe(map(__result => {
            return __result.Payload as Promise<string>;
        }));
    }
}