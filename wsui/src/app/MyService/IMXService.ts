import {Observable} from "rxjs";
export interface IMXService
{
    testJob(): Observable<boolean>;
}