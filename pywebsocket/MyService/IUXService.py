from abc import ABC, abstractmethod
from MyService.IUICloseService import IUICloseService as ImportedRef__MyService_IUICloseService

class IUXService(ImportedRef__MyService_IUICloseService):
    @abstractmethod
    async def resolve(self) -> None:
        pass
