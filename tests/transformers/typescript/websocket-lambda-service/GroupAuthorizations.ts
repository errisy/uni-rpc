import { __PolicySets } from './GroupAuthorizationPolicies';

interface IGroupPolicy {
    Name: string;
    Services: {[service: string]: string | string[]};
}

interface IGroupPolicySet {
    [group: string]: IGroupPolicy;
}

interface IPolicySets {
    [policy: string]: IGroupPolicySet;
}

export function GroupAuthorizations(policy: string, group: string, service: string, method: string): boolean {
    if (policy == '*' && group == '*') return true;
    if (!__PolicySets[policy]) return false;
    let groupPolicySet: IGroupPolicySet = __PolicySets[policy];
    if (!groupPolicySet[group]) return false;
    let groupPolicy: IGroupPolicy = groupPolicySet[group];
    if (!groupPolicy[service]) return false;
    let servicePolicy: string | string[] = groupPolicy[service];
    if (typeof servicePolicy == 'string' && servicePolicy == '*') {
        return true;
    }
    if (Array.isArray(servicePolicy) && servicePolicy.includes(method)) {
        return true;
    }
    return false;
}

export function GroupClausesAuthorize(groups: string, service: string, method: string) {
    if (typeof groups != 'string') return false;
    for (let groupClause of groups.split(',')) {
        let sections = groupClause.split('.');
        let policy = sections[0], group = sections[1];
        if (GroupAuthorizations(policy, group, service, method)) return true;
    }
    return false;
}