from __future__ import annotations
from typing import TypedDict

class TestMessage(TypedDict):
    def __init__(self):
        super().__init__()
        self.__reflection = 'MyService.TestMessage'

    __reflection: str
    name: str
    item: float