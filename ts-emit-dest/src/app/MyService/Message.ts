import {Message as $Message} from "./Message";
import {SubMessage as $SubService_SubMessage} from "./SubService/SubMessage";
export class Message
{
    public virtual string __reflection { get; set; } = "MyService.Message";
    public string name { get; set; }
    public number value { get; set; }
    public boolean tested { get; set; }
    public MyService.SubService.SubMessage<MyService.Message> sub { get; set; }
}