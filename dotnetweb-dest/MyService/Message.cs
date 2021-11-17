
namespace MyService
{
    public class Message
    {
        public virtual string __reflection { get; set; } = "MyService.Message";
        public string name { get; set; }
        public int value { get; set; }
        public bool tested { get; set; }
        public MyService.SubService.SubMessage<MyService.Message> sub { get; set; }
    }
}