import * as ts from 'typescript';

export class MemberCall {
    Name: string;
    Arguments: string[][] = [];
}

export class PropertyAccess {
    Name: string;
}

export class HostVariable {
    Identifier: string;
}

export class ExpressionChainParser {
    Arguments: string[][] = [];
    LastKind: ts.SyntaxKind;
    Chain: (MemberCall|PropertyAccess|HostVariable)[] = [];
}