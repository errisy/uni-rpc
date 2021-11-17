
namespace MyService
{
    public class AdvancedMessage2 : MyService.SubService.SubService.SubMessage<string>
    {
        public override string __reflection { get; set; } = "MyService.AdvancedMessage2";
        public string story { get; set; }
    }
}