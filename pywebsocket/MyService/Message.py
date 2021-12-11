from __future__ import annotations
from MyService.SubService.SubMessage import SubMessage as ImportedRef__MyService_SubService_SubMessage
from typing import TypedDict

class Message(TypedDict):
    def __init__(self):
        super().__init__()
        self.__reflection = 'MyService.Message'

    __reflection: str
    name: str
    value: int
    tested: bool
    sub: ImportedRef__MyService_SubService_SubMessage[Message]