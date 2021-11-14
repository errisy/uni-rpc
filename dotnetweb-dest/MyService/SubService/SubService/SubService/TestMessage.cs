
namespace MyService.SubService.SubService.SubService
{
    public abstract class TestMessage
    {
        public string __reflection { get; set; } = "MyService.SubService.SubService.SubService.TestMessage";
        public MyService.SubService.SubService.SubMessage<string> prop { get; set; }
    }
}