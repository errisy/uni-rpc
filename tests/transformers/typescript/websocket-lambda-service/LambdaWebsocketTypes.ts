import { DynamoDB } from 'aws-sdk';

export interface IIdentity {
    sourceIp: string;
}

export interface IRequestContext{
    connectedAt: number;
    requestTimeEpoch: number;
    requestId: string;
    messageId: string;
    routeKey: string;
    eventType: 'CONNECT' | 'MESSAGE';
    extendedRequestId: string;
    requestTime: string;
    messageDirection: 'IN';
    disconnectReason: string;
    domainName: string;
    stage: string;
    identity: IIdentity;
    connectionId: string;
    apiId: string;
}

export interface IBodyBase {
    action: string;
    serial: string;
    value: any;
    User?: string;
    Method?: string;
    Success: boolean;
    Reason?: string;
    Continue?: boolean;
}

export interface IDataFrame{
    serial: string;
    index: number;
    data: string;
}

export interface IWebsocketEvent{
    requestContext: IRequestContext;
    queryStringParameters: {[key: string]: string};
    multiValueQueryStringParameters: {[key: string]: string[]};
    headers: {[key: string]: string};
    isBase64Encoded: boolean;
    body: string;
}

export interface IWebSocketUser {
    Username: DynamoDB.AttributeValue;
    Connections: DynamoDB.AttributeValue;
    Groups: DynamoDB.AttributeValue;
    LastVisit: DynamoDB.AttributeValue;
    LastConnection: DynamoDB.AttributeValue;
}

export interface IWebSocketConnection {
    ConnectionId: DynamoDB.AttributeValue;
    Username: DynamoDB.AttributeValue;
    ConnectTime: DynamoDB.AttributeValue;
}