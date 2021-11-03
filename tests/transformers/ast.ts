import * as ts from 'typescript';
import { PluginConfig, ProgramTransformerExtras } from "ts-patch";
import * as path from 'path';
import {} from 'ts-expose-internals'

import { SourceFileResovler } from './resolvers';

/* ****************************************************************************************************************** */
// region: Helpers
/* ****************************************************************************************************************** */

const resolver = new SourceFileResovler();

/**
 * Patches existing Compiler Host (or creates new one) to allow feeding updated file content from cache
 */
function getPatchedHost(
  maybeHost: ts.CompilerHost | undefined,
  tsInstance: typeof ts,
  compilerOptions: ts.CompilerOptions
): ts.CompilerHost & { fileCache: Map<string, ts.SourceFile> }
{
  const fileCache = new Map();
  const compilerHost = maybeHost ?? tsInstance.createCompilerHost(compilerOptions, true);
  const originalGetSourceFile = compilerHost.getSourceFile;

  return Object.assign(compilerHost, {
    getSourceFile(fileName: string, languageVersion: ts.ScriptTarget) {
      fileName = tsInstance.normalizePath(fileName);
      if (fileCache.has(fileName)) return fileCache.get(fileName);

      const sourceFile = originalGetSourceFile.apply(void 0, Array.from(arguments) as any);
      
      fileCache.set(fileName, sourceFile);
      
      return sourceFile;
    },
    fileCache
  });
}

// endregion


/* ****************************************************************************************************************** */
// region: Program Transformer
/* ****************************************************************************************************************** */

export default function transformProgram(
  program: ts.Program,
  host: ts.CompilerHost | undefined,
  config: PluginConfig,
  { ts: tsInstance }: ProgramTransformerExtras,
): ts.Program {
  const compilerOptions = program.getCompilerOptions();
  const compilerHost = getPatchedHost(host, tsInstance, compilerOptions);
  const rootFileNames = program.getRootFileNames().map(tsInstance.normalizePath);

  /* Transform AST */
  const transformedSource = tsInstance.transform(
    /* sourceFiles */ program.getSourceFiles().filter(sourceFile => rootFileNames.includes(sourceFile.fileName)),
    /* transformers */ [ transformAst.bind(tsInstance) ],
    compilerOptions
  ).transformed;

  /* Render modified files and create new SourceFiles for them to use in host's cache */
  const { printFile } = tsInstance.createPrinter();
  for (const sourceFile of transformedSource) {
    const { fileName, languageVersion } = sourceFile;
    const updatedSourceFile = tsInstance.createSourceFile(fileName, printFile(sourceFile), languageVersion);
    compilerHost.fileCache.set(fileName, updatedSourceFile);
  }

  /* Re-create Program instance */
  return tsInstance.createProgram(rootFileNames, compilerOptions, compilerHost);
}

// endregion


/* ****************************************************************************************************************** */
// region: AST Transformer
/* ****************************************************************************************************************** */

/**
 * Change all 'number' keywords to 'string'
 *
 * @example
 * // before
 * type A = number
 *
 * // after
 * type A = string
 */
function transformAst(this: typeof ts, context: ts.TransformationContext) {
  const tsInstance = this;

  /* Transformer Function */
  return (sourceFile: ts.SourceFile) => {
    if (sourceFile.fileName.toLowerCase().endsWith('.ts') && !sourceFile.fileName.toLowerCase().endsWith('.d.ts')) {
      console.log('loading:', sourceFile.fileName, sourceFile.text);
      resolver.resolveSourceFile();
    }
    return tsInstance.visitEachChild(sourceFile, visit, context);

    /* Visitor Function */
    function visit(node: ts.Node): ts.Node {
      if (node.kind === ts.SyntaxKind.NumberKeyword)
        return context.factory.createKeywordTypeNode(tsInstance.SyntaxKind.StringKeyword);
      else
        return tsInstance.visitEachChild(node, visit, context);
    }
  }
}
