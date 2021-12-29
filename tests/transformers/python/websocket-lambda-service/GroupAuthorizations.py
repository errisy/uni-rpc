from typing import TypedDict, Union, List, Dict
from GroupAuthorizationPolicies import __PolicySets


class IGroupPolicy(TypedDict):
    Name: str
    Services: Dict[str, Union[str, List[str]]]


IGroupPolicySet = Dict[str, IGroupPolicy]

IPolicySets = Dict[str, IGroupPolicySet]


def GroupAuthorizations(policy: str, group: str, service: str, method: str) -> bool:
    if policy == '*' and group == '*':
        return True
    if policy not in __PolicySets.keys():
        return False
    groupPolicySet: IGroupPolicySet = __PolicySets[policy]
    if group not in groupPolicySet.keys():
        return False
    groupPolicy: IGroupPolicy = groupPolicySet[group]
    if service not in groupPolicy.keys():
        return False
    servicePolicy: Union[str, List[str]] = groupPolicy[service]
    if isinstance(servicePolicy, str) and servicePolicy == '*':
        return True
    if isinstance(servicePolicy, list) and servicePolicy.includes(method):
        return True
    return False


def GroupClausesAuthorize(groups: str, service: str, method: str) -> bool:
    if not isinstance(groups, str):
        return False
    for groupClause in groups.split(','):
        sections = groupClause.split('.')
        policy = sections[0]
        group = sections[1]
        if GroupAuthorizations(policy, group, service, method):
            return True
    return False
