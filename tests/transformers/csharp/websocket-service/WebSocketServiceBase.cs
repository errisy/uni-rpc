using System;
using System.Collections.ObjectModel;
using System.Reactive.Subjects;

namespace UniRpc.WebApplication
{
    public abstract class WebSocketServiceBase
    {
        public string __reflection { get; protected set; }
        public bool __isGeneric { get; set; }
        public ReadOnlyCollection<string> __genericArguments { get; protected set; }
        public Subject<BaseMessage> __outgoing { get; set; }
        public string __user { get; set; }
        public string __group { get; set; }
        public virtual async System.Threading.Tasks.Task<BaseMessage> __invoke(BaseMessage message)
        {
            throw new NotImplementedException();
        }
    }
}
