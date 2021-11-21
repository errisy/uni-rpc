import {SubMessage as $MyService_SubService_SubMessage} from "./SubService/SubMessage";
export class Message
{
    public virtual string __reflection { get; set; } = "MyService.Message";
    public name: string;
    public value: number;
    public tested: boolean;
    public sub: $MyService_SubService_SubMessage<$MyService_Message>;
}