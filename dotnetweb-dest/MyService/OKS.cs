using System.Collections.Generic;
namespace MyService
{
    public class OKS
    {
        public virtual string __reflection { get; set; } = "MyService.OKS";
        public MyService.OKS test { get; set; }
        public MyService.OKS[] okss { get; set; }
        public System.Collections.Generic.List<MyService.OKS> cheese { get; set; }
        public System.Collections.Generic.Dictionary<string, MyService.OKS> use { get; set; }
    }
}