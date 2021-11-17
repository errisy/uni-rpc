import {Message as $Message} from "..//Message";
export class AdvancedMessage : MyService.Message
{
    public override string __reflection { get; set; } = "MyService.AdvancedMessage";
    public string story { get; set; }
}