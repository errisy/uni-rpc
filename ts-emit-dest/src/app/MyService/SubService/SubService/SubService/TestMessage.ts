import {SubMessage as $SubMessage} from "../../../SubMessage";
export class TestMessage
{
    public virtual string __reflection { get; set; } = "MyService.SubService.SubService.SubService.TestMessage";
    public MyService.SubService.SubService.SubMessage<string> prop { get; set; }
}