
export type ImportBuilder = (imports: Set<string>, hierarchicalImports: Map<string, Map<string, string>>) => string;

export class CodeBuilder {
    private imports: Set<string> = new Set();
    private hierarchicalImports: Map<string, Map<string, string>> = new Map();
    private lines: string[] = [];
    private indent: number = 0;
    constructor (private importBuilder: ImportBuilder) {}
    addImport(value: string) {
        this.imports.add(value);
    }
    addHierarchicalImport(source: string, name: string, alias?: string) {
        if (!this.hierarchicalImports.has(source)) {
            this.hierarchicalImports.set(source, new Map());
        }
        this.hierarchicalImports.get(source).set(name, alias);
    }
    appendLine(value: string, indent: number = 0) {
        let prefix = '';
        for (let i = 0; i < indent; i++) {
            prefix += '    ';
        }
        this.lines.push(prefix + value);
    }
    appendMultipleLines(value: string, indent: number = 0) {
        let lines = value.split('\n');
        for (let line of lines) {
            this.appendLine(line, indent);
        }
    }
    append(value: string) {
        if (this.lines.length == 0) {
            this.lines.push(value);
        } else {
            this.lines[this.lines.length - 1] += value;
        }
    }
    build(): string {
        return `${this.importBuilder(this.imports, this.hierarchicalImports)}\r\n${this.lines.join('\r\n')}`;
    }
}