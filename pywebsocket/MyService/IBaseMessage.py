from typing import List, TypedDict

class IBaseMessage(TypedDict):
    Id: str
    Service: str
    Method: str
    GenericArguments: List[str]
    Payload: str
    Success: bool
    ErrorMessage: str