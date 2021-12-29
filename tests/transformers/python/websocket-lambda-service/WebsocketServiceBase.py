from typing import List, Coroutine, Any
from abc import abstractmethod
from UniRpc.BaseMessage import BaseMessage


class WebsocketServiceBase:
    __reflection: str
    __isGeneric: bool
    __genericArguments: List[str]
    __user: str
    __group: str

    def __getitem__(self, key: str):
        if key == '__reflection':
            return self.__reflection
        elif key == '__isGeneric':
            return self.__isGeneric
        elif key == '__genericArguments':
            return self.__genericArguments
        elif key == '__user':
            return self.__user
        elif key == '__group':
            return self.__group

    def __setitem__(self, key: str, value: Any):
        if key == '__reflection':
            self.__reflection = value
        elif key == '__isGeneric':
            self.__isGeneric = value
        elif key == '__genericArguments':
            self.__genericArguments = value
        elif key == '__user':
            self.__user = value
        elif key == '__group':
            self.__group = value

    @abstractmethod
    def __outgoing(self, message: BaseMessage) -> None:
        pass

    @abstractmethod
    def __invoke(self, message: BaseMessage) -> Coroutine[BaseMessage]:
        pass
