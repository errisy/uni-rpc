from abc import ABC, abstractmethod
from MyService.IMXService import IMXService as ImportedRef__MyService_IMXService
from MyService.IUXService import IUXService as ImportedRef__MyService_IUXService
from UniRpc.BaseMessage import BaseMessage as ImportedRef__UniRpc_BaseMessage
from UniRpc.ReturnMessage import ReturnMessage as ImportedRef__UniRpc_ReturnMessage
from UniRpc.WebsocketServiceBase import WebsocketServiceBase as ImportedRef__UniRpc_WebsocketServiceBase

class MXU(ImportedRef__UniRpc_WebsocketServiceBase, ImportedRef__MyService_IMXService, ImportedRef__MyService_IUXService):
    def __init__(self):
        super().__init__()
        self.__reflection = 'MyService.MXU'

    @abstractmethod
    async def testJob(self) -> bool:
        pass

    @abstractmethod
    async def resolve(self) -> None:
        '''
        comment 2 is not
        just one line
        '''
        pass

    @abstractmethod
    async def test(self) -> str:
        pass

    async def __invoke(self, message: ImportedRef__UniRpc_BaseMessage) -> ImportedRef__UniRpc_BaseMessage:
        if message.Method == 'testJob':
            return ImportedRef__UniRpc_ReturnMessage(message, await self.testJob())
        elif message.Method == 'resolve':
            await self.resolve()
        elif message.Method == 'test':
            return ImportedRef__UniRpc_ReturnMessage(message, await self.test())
        else:
            raise Exception(f'{message.Service}.{message.Method} is not defined.')