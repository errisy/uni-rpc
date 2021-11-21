

export interface IBodyBase {
    action: 'echo' | 'KeggApi';
    serial?: string;
    value?: any;
    User?: string;
    Method?: string;
    Success?: boolean;
    Reason?: string;
    Continue?: boolean;
}

export type KEGGMethod = 'get' | 'list' | 'find';

export interface IKEGGMessage extends IBodyBase{
    Method: KEGGMethod;
    Key?: string;
    Content?: string;
}