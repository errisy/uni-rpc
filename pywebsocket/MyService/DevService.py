from abc import ABC, abstractmethod
from MyService.Message import Message as ImportedRef__MyService_Message
from typing import List, TypeVar
from UniRpc.BaseMessage import BaseMessage as ImportedRef__UniRpc_BaseMessage
from UniRpc.ReturnMessage import ReturnMessage as ImportedRef__UniRpc_ReturnMessage
from UniRpc.WebsocketServiceBase import WebsocketServiceBase as ImportedRef__UniRpc_WebsocketServiceBase

Dog = TypeVar('Dog')
Method_TypeArg__Release__Cat = TypeVar('Method_TypeArg__Release__Cat')

class DevService(ImportedRef__UniRpc_WebsocketServiceBase):
    def __init__(self):
        super().__init__()
        self.__reflection = 'MyService.DevService'

    @abstractmethod
    async def Send(self, message: ImportedRef__MyService_Message) -> bool:
        pass

    @abstractmethod
    async def Get(self) -> bool:
        pass

    @abstractmethod
    async def StoryCount(self) -> float:
        pass

    @abstractmethod
    async def Test(self) -> str:
        pass

    @abstractmethod
    async def AB(self, my: float) -> float:
        pass

    @abstractmethod
    async def Gap(self, value: int, enabled: bool) -> List[int]:
        pass

    @abstractmethod
    async def Release(self, cat: Method_TypeArg__Release__Cat, dog: Dog) -> bytes:
        '''
        release resource
        :param cat: the cat instance
        '''
        pass

    @abstractmethod
    async def GetMessage(self) -> ImportedRef__MyService_Message:
        pass

    @abstractmethod
    async def IncomingCall(self) -> None:
        pass

    async def __invoke(self, message: ImportedRef__UniRpc_BaseMessage) -> ImportedRef__UniRpc_BaseMessage:
        if message.Method == 'Send':
            ____message: ImportedRef__MyService_Message = message.Payload['message']
            return ImportedRef__UniRpc_ReturnMessage(message, await self.Send(____message))
        elif message.Method == 'Get':
            return ImportedRef__UniRpc_ReturnMessage(message, await self.Get())
        elif message.Method == 'StoryCount':
            return ImportedRef__UniRpc_ReturnMessage(message, await self.StoryCount())
        elif message.Method == 'Test':
            return ImportedRef__UniRpc_ReturnMessage(message, await self.Test())
        elif message.Method == 'AB':
            ____my: float = message.Payload['my']
            return ImportedRef__UniRpc_ReturnMessage(message, await self.AB(____my))
        elif message.Method == 'Gap':
            ____value: int = message.Payload['value']
            ____enabled: bool = message.Payload['enabled']
            return ImportedRef__UniRpc_ReturnMessage(message, await self.Gap(____value, ____enabled))
        elif message.Method == 'Release':
            ____cat: any = message.Payload['cat']
            ____dog: Dog = message.Payload['dog']
            return ImportedRef__UniRpc_ReturnMessage(message, await self.Release(____cat, ____dog))
        elif message.Method == 'GetMessage':
            return ImportedRef__UniRpc_ReturnMessage(message, await self.GetMessage())
        elif message.Method == 'IncomingCall':
            await self.IncomingCall()
        else:
            raise Exception(f'{message.Service}.{message.Method} is not defined.')