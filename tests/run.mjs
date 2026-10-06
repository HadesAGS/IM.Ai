import ts from "typescript";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir=await mkdtemp(join(tmpdir(),"aperture-tests-"));
try {
  for(const name of ["image-workspace","ai-server"]){
    let source=await readFile(new URL(`../lib/${name}.ts`,import.meta.url),"utf8");
    source=source.replace('"./image-workspace"','"./image-workspace.mjs"');
    const {outputText}=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}});
    await writeFile(join(dir,`${name}.mjs`),outputText);
  }
  const image=await import(pathToFileURL(join(dir,"image-workspace.mjs")));
  const server=await import(pathToFileURL(join(dir,"ai-server.mjs")));
  const {runTests}=await import("./suite.mjs");await runTests(image,server);
} finally { await rm(dir,{recursive:true,force:true}); }
