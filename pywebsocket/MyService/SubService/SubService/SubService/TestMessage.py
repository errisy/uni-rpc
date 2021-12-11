from __future__ import annotations
from MyService.SubService.SubService.SubMessage import SubMessage as ImportedRef__MyService_SubService_SubService_SubMessage
from typing import TypedDict

class TestMessage(TypedDict):
    def __init__(self):
        super().__init__()
        self.__reflection = 'MyService.SubService.SubService.SubService.TestMessage'

    __reflection: str
    prop: ImportedRef__MyService_SubService_SubService_SubMessage[str]