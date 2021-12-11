from __future__ import annotations
from typing import List, TypedDict, TypedVar
Thrift = TypedVar('Thrift')

class Tom(Generic[Thrift], TypedDict):
    def __init__(self):
        super().__init__()
        self.__reflection = 'USE.Tom'

    __reflection: str
    value: List[List[Thrift]]