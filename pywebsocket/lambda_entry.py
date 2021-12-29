from UniRpc.LambdaWebsocketTypes import IWebsocketEvent, IRequestContext
from UniRpc.WebsocketService import WebsocketService
from typing import Dict, Any


async def handler(event: IWebsocketEvent, context: Dict[str, Any] = None):
    service = WebsocketService()
    return await service.ProcessEvent(event)
