using System;
using System.Collections.Generic;
using System.Reactive.Subjects;

namespace UniRpc.WebApplication
{
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
