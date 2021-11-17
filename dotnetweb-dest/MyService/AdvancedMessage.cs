
namespace MyService
{
    public class AdvancedMessage : MyService.Message
    {
        public override string __reflection { get; set; } = "MyService.AdvancedMessage";
        public string story { get; set; }
    }
}