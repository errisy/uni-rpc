import {SubMessage as $MyService_SubService_SubMessage} from "./SubService/SubMessage";
export class Message
{
    __reflection: string = "MyService.Message";
    name: string;
    value: number;
    tested: boolean;
    sub: $MyService_SubService_SubMessage<$MyService_Message>;
}