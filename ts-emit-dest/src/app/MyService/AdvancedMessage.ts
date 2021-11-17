import {Message as $MyService_Message} from "../Message";
export class AdvancedMessage extends $MyService_Message
{
    public override string __reflection { get; set; } = "MyService.AdvancedMessage";
    public story: string;
}