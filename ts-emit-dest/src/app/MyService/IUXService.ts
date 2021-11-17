import {IUICloseService as $IUICloseService} from "..//IUICloseService";
namespace MyService
{
    export interface IUXService : MyService.IUICloseService
    {
        public void resolve();
    }
}