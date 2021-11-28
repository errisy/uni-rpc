import {SubMessage as $MyService_SubService_SubMessage} from "./SubService/SubMessage";
export class Message
{
    __reflection: string = "MyService.Message";
    name: string;
    public value: number;
    public tested: boolean;
    public sub: $MyService_SubService_SubMessage<$MyService_Message>;
}