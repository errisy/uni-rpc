from typing import List, Coroutine
from abc import abstractmethod
from UniRpc.BaseMessage import BaseMessage

class WebsocketServiceBase:
    __reflection: str
    __isGeneric: bool
    __genericArguments: List[str]
    @abstractmethod
    def __outgoing(message: BaseMessage) -> None:
        pass
    __user: str
    __group: str
    @abstractmethod
    def __invoke(message: BaseMessage) -> Coroutine[BaseMessage]:
        pass