
namespace MyService.SubService.SubService
{
    public abstract class SubMessage <T>
    {
        public string __reflection { get; set; } = "MyService.SubService.SubService.SubMessage";
        public MyService.Message message { get; set; }
    }
}