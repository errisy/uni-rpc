from abc import ABC, abstractmethod

class IUICloseService(ABC):
    @abstractmethod
    async def test(self) -> str:
        pass
