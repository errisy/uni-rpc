

export class CodeBuilder {
    private imports: Set<string> = new Set();
    private lines: string[] = [];
    private indent: number = 0;
    addImport(value: string) {
        this.imports.add(value);
    }
    appendLine(value: string, indent: number = 0) {
        let prefix = '';
        for (let i = 0; i < indent; i++) {
            prefix += '    ';
        }
        this.lines.push(prefix + value);
    }
    append(value: string) {
        if (this.lines.length == 0) {
            this.lines.push(value);
        } else {
            this.lines[this.lines.length - 1] += value;
        }
    }
    build(): string {
        let importNamespaces: string[] = [];
        for (let importNs of this.imports) {
            importNamespaces.push(`using ${importNs};`);
        }
        importNamespaces = importNamespaces.sort();
        return `${importNamespaces.join('\r\n')}\r\n${this.lines.join('\r\n')}`;
    }
}