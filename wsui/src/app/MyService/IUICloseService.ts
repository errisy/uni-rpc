import {Observable} from "rxjs";
export interface IUICloseService
{
    test(): Observable<Promise<string>>;
}