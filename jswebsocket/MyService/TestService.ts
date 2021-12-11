import {BaseMessage as $UniRpc_BaseMessage} from "../UniRpc/BaseMessage";
import {WebsocketServiceBase as $UniRpc_WebsocketServiceBase} from "../UniRpc/WebsocketServiceBase";
import {TestMessage as $MyService_TestMessage} from "./TestMessage";
export abstract class TestService extends $UniRpc_WebsocketServiceBase
{
    public constructor () {
        super();
        this.__reflection = "MyService.TestService";
    }
    public abstract test(name: string, value: number, msg: $MyService_TestMessage): Promise<void>;
    public async __invoke(message: $UniRpc_BaseMessage): Promise<$UniRpc_BaseMessage> {
        switch (message.Method)
        {
            case "test":
                {
                    let ____name: string = message.Payload['name'];
                    let ____value: number = message.Payload['value'];
                    let ____msg: $MyService_TestMessage = message.Payload['msg'];
                    await this.test(____name, ____value, ____msg);
                    break;
                }
        }
        throw `${message.Service}.${message.Method} is not defined.`;
    }
}