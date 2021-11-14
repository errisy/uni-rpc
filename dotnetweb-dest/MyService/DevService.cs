using System.Collections.Generic;
using System;
using UniRpc.WebApplication;
namespace MyService
{
    public abstract class DevService<Dog>: WebSocketServiceBase
    {
        public DevService()
        {
            __reflection = "MyService.DevService";
            __genericArguments = new List<string>() { typeof(Dog).FullName }.AsReadOnly();
        }
        public abstract bool Send(MyService.Message message);
        public abstract bool Get();
        public abstract float StoryCount();
        public abstract string Test();
        public abstract float AB(double my);
        public abstract System.Collections.Generic.List<long> Gap(int value, bool enabled);
        public abstract byte[] Release<Cat>(Cat cat, Dog dog);
        public abstract MyService.Message GetMessage();
        public abstract void IncomingCall();
        public override BaseMessage __invoke(BaseMessage message)
        {
            switch (message.Method)
            {
                case "Send":
                    {
                        MyService.Message ____message = message.Payload.GetProperty<MyService.Message>("message");
                        return message.ReturnMessage(Send(____message));
                    }
                case "Get":
                    {
                        return message.ReturnMessage(Get());
                    }
                case "StoryCount":
                    {
                        return message.ReturnMessage(StoryCount());
                    }
                case "Test":
                    {
                        return message.ReturnMessage(Test());
                    }
                case "AB":
                    {
                        double ____my = message.Payload.GetProperty<double>("my");
                        return message.ReturnMessage(AB(____my));
                    }
                case "Gap":
                    {
                        int ____value = message.Payload.GetProperty<int>("value");
                        bool ____enabled = message.Payload.GetProperty<bool>("enabled");
                        return message.ReturnMessage(Gap(____value, ____enabled));
                    }
                case "Release":
                    {
                        object ____cat = message.Payload.GetPropertyByReflection("cat");
                        Dog ____dog = message.Payload.GetProperty<Dog>("dog");
                        return message.ReturnMessage(Release(____cat, ____dog));
                    }
                case "GetMessage":
                    {
                        return message.ReturnMessage(GetMessage());
                    }
                case "IncomingCall":
                    {
                        IncomingCall();
                        break;
                    }
            }
            throw new NotImplementedException($"{message.Service}.{message.Method} is not implemented.");
        }
    }
}