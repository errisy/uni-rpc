import {SubMessage as $SubService_SubService_SubMessage} from "..//SubService/SubService/SubMessage";
export class AdvancedMessage2 : MyService.SubService.SubService.SubMessage<string>
{
    public override string __reflection { get; set; } = "MyService.AdvancedMessage2";
    public string story { get; set; }
}