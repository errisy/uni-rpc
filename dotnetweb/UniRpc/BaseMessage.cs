using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;
using System.Reactive.Subjects;

namespace UniRpc.WebApplication
{
    public class BaseMessage
    {
        public string Id { get; set; }
        public string Service { get; set; }
        public string Method { get; set; }
        public string[] GenericArguments { get; set; }
        public JsonElement Payload { get; set; }
    }

    public abstract class WebSocketServiceBase
    {
        public string __name { get; set; }
        public bool __isGeneric { get; set; }
        public List<string> __genericArguments { get; set; }
        public Subject<BaseMessage> __outgoing { get; set; }
        public string __user { get; set; }
        public string __group { get; set; }

        public virtual BaseMessage __invoke(BaseMessage message)
        {
            throw new NotImplementedException();
        }
    }
}
