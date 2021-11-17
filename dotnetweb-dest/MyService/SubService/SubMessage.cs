
namespace MyService.SubService
{
    public class SubMessage <T>
    {
        public virtual string __reflection { get; set; } = "MyService.SubService.SubMessage";
        public MyService.Message message { get; set; }
    }
}