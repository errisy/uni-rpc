import * as ts from 'typescript';

function emit(sourceFile: ts.SourceFile) {
    if(sourceFile.fileName.toLowerCase().endsWith('.rpc.ts')) {
      for(let statement of sourceFile.statements) {
        console.log(statement);
      }
    }
    return sourceFile;
}

const transformer: ts.TransformerFactory<ts.SourceFile> = () => {
    return sourceFile => {
      return ts.factory.updateSourceFile(emit(sourceFile), [
        ...sourceFile.statements,
      ]);
    };
  };
  
  export default transformer;