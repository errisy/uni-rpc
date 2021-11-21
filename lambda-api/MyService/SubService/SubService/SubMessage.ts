import {Message as $MyService_Message} from "../../Message";
export class SubMessage <T>
{
    public virtual string __reflection { get; set; } = "MyService.SubService.SubService.SubMessage";
    public message: $MyService_Message;
}