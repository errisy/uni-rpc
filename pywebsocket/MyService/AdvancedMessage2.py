from __future__ import annotations
from MyService.SubService.SubService.SubMessage import SubMessage as ImportedRef__MyService_SubService_SubService_SubMessage
from typing import TypedDict

class AdvancedMessage2(ImportedRef__MyService_SubService_SubService_SubMessage[str]):
    def __init__(self):
        super().__init__()
        self.__reflection = 'MyService.AdvancedMessage2'

    __reflection: str
    story: str