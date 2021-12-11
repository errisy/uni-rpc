from abc import ABC, abstractmethod

class IMXService(ABC):
    @abstractmethod
    async def testJob(self) -> bool:
        pass
