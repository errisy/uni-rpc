from __future__ import annotations
from typing import Dict, Any
import json
import boto3
import boto3_type_annotations.dynamodb
import boto3_type_annotations.apigatewaymanagementapi
import os

from WebsocketServiceBase import WebsocketServiceBase
from LambdaWebsocketTypes import IWebSocketUser, IWebsocketEvent, IRequestContext, IWebSocketConnection
from BaseMessage import BaseMessage
from GroupAuthorizations import GroupClausesAuthorize


WebSocketConnectionsTable = os.getenv('WebSocketConnectionsTable')
WebSocketUsersTable = os.getenv('WebSocketUsersTable')
dynamo: boto3_type_annotations.dynamodb.Client = boto3.client('dynamodb')

class WebsocketService:
    tracking: Dict[str, Any] = dict()
    services: Dict[str, WebsocketServiceBase] = dict()
    user: IWebSocketUser

    def RegisterService(self, service: WebsocketServiceBase) -> WebsocketService:
        self.services.set(service['__reflection'], service)
        return self

    async def ProcessEvent(self, event: IWebsocketEvent):
        try:
            self.user = await self.GetUser(event.requestContext)
        except Exception as exception:
            print(exception)
            return {
                'statusCode': 401,
                'body': 'Unauthorized'
            }
        message: BaseMessage = json.loads(event.body)
        if not GroupClausesAuthorize(self.user.Groups.S, message.Service, message.Method):
            return {
                'statusCode': 401,
                'body': 'Unauthorized'
            }
        if message.Service in self.services.keys():
            service = self.services.get(message.Service)
            result = await service.__invoke(message)
            self.Respond(event.requestContext, result);
            return {
                'statusCode': 202,
                'body': 'Accepted'
            }
        return {
            'statusCode': 403,
            'body': 'Forbidden'
        }

    async def GetUser(self, context: IRequestContext):
        connectionId = context['connectionId']
        connectionResponse: Dict[str, Any] = dynamo.get_item({
            'TableName': WebSocketConnectionsTable,
            'Key': {
                'ConnectionId': {
                    'S': connectionId
                }
            }
        })
        if 'Item' not in connectionResponse.keys():
            raise Exception(f'No Connection was found for Connection Id {connectionId}')
        connection: IWebSocketConnection = connectionResponse['Item']
        username = connection['Username']['S']
        userResponse = dynamo.getItem({
            'TableName': WebSocketUsersTable,
            'Key': {
                'Username': {
                    'S': username
                }
            }
        })
        if 'Item' not in userResponse.keys():
            raise Exception(f'No user was found for User Id {username} via Connection Id ${connectionId}')
        return userResponse['Item']

    def RespondUnauthorized(self, event: IWebsocketEvent, message: BaseMessage):
        response: BaseMessage = {
            'Id': message['Id'],
            'Service': message['Service'],
            'Method': message['Method'],
            'Success': False,
            'ErrorMessage': 'Unauthorzied'
        }
        self.Respond(event.requestContext, response);

    def Respond(self, context: IRequestContext, data: any):
        agm: boto3_type_annotations.apigatewaymanagementapi.Client = boto3.client(
            'apigatewaymanagementapi', endpoint_url=context['domainName'] + '/' + context['stage']
        )
        connectionId: str = context['connectionId']
        stringData: str = json.dumps(data)
        agm.postToConnection({
            'ConnectionId': connectionId,
            'Data': stringData
        })
