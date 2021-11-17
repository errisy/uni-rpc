import {IMXService as $IMXService} from "./IMXService";
import {IUXService as $IUXService} from "./IUXService";
import {Injectable} from "@angular/core";
@Injectable({
    providedIn: 'root'
})
export class MXU : WebSocketServiceBase, MyService.IMXService, MyService.IUXService
{
    public MXU()
    {
        __reflection = "MyService.MXU";
        __genericArguments = new List<string>().AsReadOnly();
    }
    public boolean testJob();
    public void resolve();
    public Promise<string> test();
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