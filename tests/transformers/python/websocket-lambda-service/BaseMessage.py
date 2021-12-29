from typing import TypedDict, List


class BaseMessage(TypedDict):
    Id: str
    Service: str
    Method: str
    GenericArguments: List[str]
    Payload: str
    Success: bool
    ErrorMessage: str
