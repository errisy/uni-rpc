import {IUICloseService as $MyService_IUICloseService} from "./IUICloseService";
import {Observable} from "rxjs";
export interface IUXService extends $MyService_IUICloseService
{
    resolve(): Observable<void>;
}