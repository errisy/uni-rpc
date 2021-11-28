import {IUICloseService as $MyService_IUICloseService} from "./IUICloseService";
namespace MyService
{
    export interface IUXService extends $MyService_IUICloseService
    {
        resolve(): void;
    }
}