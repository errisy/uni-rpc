using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using UniRpc.WebApplication;
namespace MyService
{
    public abstract class MXU : WebSocketServiceBase, MyService.IMXService, MyService.IUXService
    {
        public MXU()
        {
            __reflection = "MyService.MXU";
            __genericArguments = new List<string>().AsReadOnly();
        }
        public abstract bool testJob();
        public abstract void resolve();
        public abstract System.Threading.Tasks.Task<string> test();
        public override BaseMessage __invoke(BaseMessage message)
        {
            switch (message.Method)
            {
                case "testJob":
                    {
                        return message.ReturnMessage(testJob());
                    }
                case "resolve":
                    {
                        resolve();
                        break;
                    }
                case "test":
                    {
                        return message.ReturnMessage(test());
                    }
            }
            throw new NotImplementedException($"{message.Service}.{message.Method} is not implemented.");
        }
    }
}