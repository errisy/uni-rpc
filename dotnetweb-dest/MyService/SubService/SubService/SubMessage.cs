
namespace MyService.SubService.SubService
{
    public class SubMessage <T>
    {
        public virtual string __reflection { get; set; } = "MyService.SubService.SubService.SubMessage";
        public MyService.Message message { get; set; }
    }
}