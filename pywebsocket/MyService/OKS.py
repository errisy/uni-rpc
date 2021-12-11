from __future__ import annotations
from typing import Dict, List, TypedDict

class OKS(TypedDict):
    def __init__(self):
        super().__init__()
        self.__reflection = 'MyService.OKS'

    __reflection: str
    test: OKS
    okss: List[OKS]
    cheese: List[OKS]
    use: Dict[str, OKS]