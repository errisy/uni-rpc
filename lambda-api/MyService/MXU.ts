import {WebsocketService as $UniRpc_WebsocketService} from "../UniRpc/WebsocketService";
import {WebsocketServiceBase as $UniRpc_WebsocketServiceBase} from "../UniRpc/WebsocketServiceBase";
import {IMXService as $MyService_IMXService} from "./IMXService";
import {IUXService as $MyService_IUXService} from "./IUXService";
export abstract class MXU extends $UniRpc_WebsocketServiceBase implements $MyService_IMXService, $MyService_IUXService
{
    public constructor (private __websocketService: $UniRpc_WebsocketService)
    {
        super();
        this.__reflection = "MyService.MXU";
        this.__genericArguments = [];
    }
    public abstract testJob(): Promise<boolean>;
    /**
     * comment 2 is not
     * just one line
     */
    public abstract resolve(): Promise<void>;
    public abstract test(): Promise<Promise<string>>;
}