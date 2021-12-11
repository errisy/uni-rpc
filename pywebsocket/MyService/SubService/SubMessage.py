from __future__ import annotations
from MyService.Message import Message as ImportedRef__MyService_Message
from typing import TypedDict, TypedVar
T = TypedVar('T')

class SubMessage(Generic[T], TypedDict):
    def __init__(self):
        super().__init__()
        self.__reflection = 'MyService.SubService.SubMessage'

    __reflection: str
    message: ImportedRef__MyService_Message