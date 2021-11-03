import * as ts from 'typescript';
import { ProgramTransformerExtras, PluginConfig } from 'ts-patch';

export default function(program: ts.Program, 
    host: ts.CompilerHost | undefined, 
    options: PluginConfig, 
    { ts: tsInstance }: ProgramTransformerExtras) {
    let files = program.getSourceFiles()
        .filter(file => {
            let name = file.fileName.toLowerCase();
            return name.endsWith('.ts') && !name.endsWith('.d.ts');
        });
        global['SourceFileCount'] = files.length;
        
    return tsInstance.createProgram(
        program.getRootFileNames(),
        program.getCompilerOptions(),
        host,
        program
      );
}
