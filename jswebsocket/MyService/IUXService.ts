import {IUICloseService as $MyService_IUICloseService} from "./IUICloseService";
export interface IUXService extends $MyService_IUICloseService
{
    resolve(): Promise<void>;
}