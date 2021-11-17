import {Cat as $Cat} from "./Cat";
import {Dog as $Dog} from "./Dog";
import {Message as $Message} from "./Message";
import {Injectable} from "@angular/core";
@Injectable({
    providedIn: 'root'
})
export class DevService<Dog> : WebSocketServiceBase
{
    public DevService()
    {
        __reflection = "MyService.DevService";
        __genericArguments = new List<string>() { typeof(Dog).FullName }.AsReadOnly();
    }
    public boolean Send(MyService.Message message);
    public boolean Get();
    public number StoryCount();
    public string Test();
    public number AB(number my);
    public number[] Gap(number value, boolean enabled);
    public string Release<Cat>(Cat cat, Dog dog);
    public MyService.Message GetMessage();
    public void IncomingCall();
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
                    number ____my = message.Payload.GetProperty<number>("my");
                    return message.ReturnMessage(AB(____my));
                }
            case "Gap":
                {
                    number ____value = message.Payload.GetProperty<number>("value");
                    boolean ____enabled = message.Payload.GetProperty<boolean>("enabled");
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