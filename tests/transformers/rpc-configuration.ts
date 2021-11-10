
export interface Target {
    cs: string | string[];
    ts: string | string[];
    py: string | string[];
    ja: string | string[];
    /** List of selected namespaces */
    ns: string[];
    type: 'service' | 'client';
    csCode?: string;
    tsCode?: string;
    pyCode?: string;
    jaCode?: string;
}

export interface RPC {
    rpc: Target[];
}
