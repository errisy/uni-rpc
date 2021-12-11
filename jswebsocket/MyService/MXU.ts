import {BaseMessage as $UniRpc_BaseMessage} from "../UniRpc/BaseMessage";
import {ReturnMessage as $UniRpc_ReturnMessage} from "../UniRpc/ReturnMessage";
import {WebsocketServiceBase as $UniRpc_WebsocketServiceBase} from "../UniRpc/WebsocketServiceBase";
import {IMXService as $MyService_IMXService} from "./IMXService";
import {IUXService as $MyService_IUXService} from "./IUXService";
export abstract class MXU extends $UniRpc_WebsocketServiceBase implements $MyService_IMXService, $MyService_IUXService
{
    public constructor () {
        super();
        this.__reflection = "MyService.MXU";
    }
    public abstract testJob(): Promise<boolean>;
    /**
     * comment 2 is not
     * just one line
     */
    public abstract resolve(): Promise<void>;
    public abstract test(): Promise<Promise<string>>;
    public async __invoke(message: $UniRpc_BaseMessage): Promise<$UniRpc_BaseMessage> {
        switch (message.Method)
        {
            case "testJob":
                {
                    return $UniRpc_ReturnMessage(message, await this.testJob());
                }
            case "resolve":
                {
                    await this.resolve();
                    break;
                }
            case "test":
                {
                    return $UniRpc_ReturnMessage(message, await this.test());
                }
        }
        throw `${message.Service}.${message.Method} is not defined.`;
    }
}