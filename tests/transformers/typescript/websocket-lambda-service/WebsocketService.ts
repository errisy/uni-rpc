import { WebsocketServiceBase } from "./WebsocketServiceBase";
import { IRequestContext, IWebSocketConnection, IWebsocketEvent, IWebSocketUser } from "./LambdaWebsocketTypes";
import { BaseMessage } from "./BaseMessage";
import { GroupClausesAuthorize } from './GroupAuthorizations'
import { ApiGatewayManagementApi, DynamoDB } from 'aws-sdk';

const WebSocketConnectionsTable = process.env['WebSocketConnectionsTable'];
const WebSocketUsersTable = process.env['WebSocketUsersTable'];
const dynamo = new DynamoDB();

export class WebsocketService {
  tracking: {[serial: string]: any} = {};
  services: Map<string, WebsocketServiceBase> = new Map<string, WebsocketServiceBase>();
  user: IWebSocketUser;

  RegisterService<T extends WebsocketServiceBase>(service: T): this {
    this.services.set(service.__reflection, service);
    return this;
  }

  async ProcessEvent(event: IWebsocketEvent) {
    try {
      this.user = await this.GetUser(event.requestContext);
    } catch (ex) {
      console.error(ex);
      return {
        statusCode: 401,
        body: 'Unauthorized'
      };
    }
    let message: BaseMessage = JSON.parse(event.body);
    if (!GroupClausesAuthorize(this.user.Groups.S, message.Service, message.Method)) {
      return {
        statusCode: 401,
        body: 'Unauthorized'
      };
    }
    if (this.services.has(message.Service)) {
      let service = this.services.get(message.Service);
      let result = await service.__invoke(message);
      await this.Respond(event.requestContext, result);
      return {
        statusCode: 202,
        body: 'Accepted'
      };
    }
    return {
      statusCode: 403,
      body: 'Forbidden'
    };
  }

  async GetUser(context: IRequestContext): Promise<IWebSocketUser> {
    let connectionResponse = await (dynamo.getItem({
        TableName: WebSocketConnectionsTable,
        Key: {
            ConnectionId: { S: context.connectionId }
        }
    }).promise());
    if(!connectionResponse.Item) throw `No Connection was found for Connection Id ${context.connectionId}`;
    let connection: IWebSocketConnection = connectionResponse.Item as any;
    let userResponse = await (dynamo.getItem({
        TableName: WebSocketUsersTable,
        Key: {
            Username: { S: connection.Username.S }
        }
    }).promise());
    if(!userResponse.Item) throw `No user was found for User Id ${connection.Username.S} via Connection Id ${context.connectionId}`;
    return userResponse.Item as any;
  }

  async RespondUnauthorized(event: IWebsocketEvent, message: BaseMessage) {
    let response: BaseMessage = {} as any;
    response.Id = message.Id;
    response.Service = message.Service;
    response.Method = message.Method;
    response.Success = false;
    response.ErrorMessage = `Unauthorzied`;
    await this.Respond(event.requestContext, response);
  }

  async Respond(context: IRequestContext, data: any): Promise<void> {
    let agm = new ApiGatewayManagementApi({
        endpoint: `${context.domainName}/${context.stage}`
    });
    let stringData = JSON.stringify(data);
    await (agm.postToConnection({
        ConnectionId: context.connectionId,
        Data: stringData
    }).promise());
  }
}
