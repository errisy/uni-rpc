import { BaseMessage } from './BaseMessage';

export abstract class WebsocketServiceBase
{
    __reflection: string;
    __isGeneric: boolean;
    __genericArguments: string[];
    abstract __outgoing(message: BaseMessage): void;
    __user: string;
    __group: string;
    abstract __invoke(message: BaseMessage): Promise<BaseMessage>;
}