using System.Collections.Generic;
namespace USE
{
    public abstract class Tom <Thrift>
    {
        public string __reflection { get; set; } = "USE.Tom";
        public System.Collections.Generic.List<Thrift[]> value { get; set; }
    }
}