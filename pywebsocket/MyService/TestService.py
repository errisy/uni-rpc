from abc import ABC, abstractmethod
from MyService.TestMessage import TestMessage as ImportedRef__MyService_TestMessage
from UniRpc.BaseMessage import BaseMessage as ImportedRef__UniRpc_BaseMessage
from UniRpc.WebsocketServiceBase import WebsocketServiceBase as ImportedRef__UniRpc_WebsocketServiceBase

class TestService(ImportedRef__UniRpc_WebsocketServiceBase):
    def __init__(self):
        super().__init__()
        self.__reflection = 'MyService.TestService'

    @abstractmethod
    async def test(self, name: str, value: float, msg: ImportedRef__MyService_TestMessage) -> None:
        pass

    async def __invoke(self, message: ImportedRef__UniRpc_BaseMessage) -> ImportedRef__UniRpc_BaseMessage:
        if message.Method == 'test':
            ____name: str = message.Payload['name']
            ____value: float = message.Payload['value']
            ____msg: ImportedRef__MyService_TestMessage = message.Payload['msg']
            await self.test(____name, ____value, ____msg)
        else:
            raise Exception(f'{message.Service}.{message.Method} is not defined.')