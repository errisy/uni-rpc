from __future__ import annotations
from MyService.Message import Message as ImportedRef__MyService_Message
from typing import TypedDict

class AdvancedMessage(ImportedRef__MyService_Message):
    def __init__(self):
        super().__init__()
        self.__reflection = 'MyService.AdvancedMessage'

    __reflection: str
    story: str