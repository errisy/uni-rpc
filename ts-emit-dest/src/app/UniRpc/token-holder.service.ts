import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";
import { LocalStorageService } from "./local-storage.service";

export type UserGroup = 'Administrators' | 'Strategists' | 'InternalStrategists' | 'StrategyAPIEditors' | 'Customers'

interface IJWTHeader {
    kid: string;
    alg: string;
}

interface IJsonWebKey {
    alg: string;
    e: string;
    kid: string;
    kty: string;
    n: string;
    use: string;
}

interface IJsonWebKeys {
    keys: IJsonWebKey[];
}

interface IPayloadData {
    sub: string;
    'cognito:groups': string[];
    token_use: string;
    scope: string;
    auth_time: number;
    iss: string;
    exp: number;
    iat: number;
    version: number;
    jti: string;
    client_id: string;
    username: string;
}

interface IJWTData{
    header: IJWTHeader;
    payload: IPayloadData;
    signature: string;
}

export function decodeJWT(token: string): IJWTData {
    let sections = token.split('.');
    let header = sections[0], payload = sections[1], signature = sections[2];
    return {
        header: JSON.parse(atob(header)),
        payload: JSON.parse(atob(payload)),
        signature: signature
    };
}

@Injectable({
    providedIn: 'root'
})
export class TokenHolder {
    Access: string | null = null;
    Id: string | null = null;
    Type: 'Bearer' = 'Bearer';
    AuthenticationTime: number = Date.now();
    Expires: number = Date.now();
    Username: string | null = null;
    Groups: string[] = [];

    constructor(private storage: LocalStorageService){
        // check if there is acces token
        let access = this.storage.getItem('access_token');
        if(typeof access == 'string' && access.length > 0){
            let jwtData = decodeJWT(access);
            let expires = jwtData.payload.exp * 1000;
            if(expires > Date.now() + 18000000){ // if there is more than 10 min
                console.log('load access token from local storage');
                this.Access = access;
                this.Username = jwtData.payload.username;
                this.Groups = jwtData.payload['cognito:groups'];
                this.AuthenticationTime = jwtData.payload.auth_time * 1000;
                this.Expires = jwtData.payload.exp * 1000;
            }
        }
        let id = this.storage.getItem('id_token');
        if(typeof id == 'string' && id.length > 0){
            this.Id = id;
        }
    }

    JWTVerify() {
        console.log('JWT:', this.Access);
        this.storage.setItem('access_token', this.Access as any);
        this.storage.setItem('id_token', this.Id as any);
        let access: string = this.Access as string, id: string = this.Id as string;
        let jwtData = decodeJWT(access);
        // id token does not always exists
        let idData = decodeJWT(id);
        console.log('payload:', jwtData);
        console.log('id data:', idData);
        this.Username = jwtData.payload.username;
        this.Groups = jwtData.payload['cognito:groups'];
        console.log('Groups:', this.Groups);
        this.AuthenticationTime = jwtData.payload.auth_time * 1000;
        this.Expires = jwtData.payload.exp * 1000;
        // console.log('expiring time:', new Date(payloadData.auth_time * 1000), ' -> ', new Date(payloadData.exp * 1000));
    }

    hasAnyGroup(...groups: UserGroup[]) {
        for(let group of groups){
            if(this.Groups.includes(group)) return true;
        }
        return false;
    }

    logout() {
        this.storage.setItem('access_token', '');
        this.storage.setItem('id_token', '');
        this.Expires = Date.now();

        let logoutUrl = `${environment.authUri}/logout?client_id=${environment.clientId}&response_type=token&redirect_uri=${window.location.protocol}//${window.location.host}&state=${encodeURIComponent(window.location.pathname)}`;
        console.log('logout:', logoutUrl);
        window.location.href = logoutUrl;
    }
}