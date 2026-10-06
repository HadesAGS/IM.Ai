// Generates an isolated, local browser test page. Never used by the app's actions.
import ts from "typescript";
import { readFile, writeFile, unlink } from "node:fs/promises";
const target=new URL("../public/_aperture-verification.html",import.meta.url);
if(process.argv.includes("--clean")){await unlink(target).catch(()=>{});process.exit(0);}
const source=await readFile(new URL("../lib/image-workspace.ts",import.meta.url),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const moduleURL="data:text/javascript;base64,"+Buffer.from(compiled).toString("base64");
const script=await readFile(new URL("./browser-suite.js",import.meta.url),"utf8");
await writeFile(target,`<!doctype html><meta charset="utf-8"><title>Aperture browser verification</title><style>body{font:16px system-ui;padding:40px;max-width:900px;margin:auto;background:#17151f;color:#e9e2f6}button{padding:15px;background:#ad8aef;border:0;border-radius:8px;font:inherit}pre{white-space:pre-wrap;line-height:1.8}</style><h1>Aperture browser verification</h1><p>Local synthetic fixtures only. No API calls.</p><button id="run">Run browser checks</button><pre id="results">Ready.</pre><script type="module">import * as image from ${JSON.stringify(moduleURL)};${script}</script>`);
console.log("Open http://localhost:5173/_aperture-verification.html, then click Run browser checks. Clean up with node tests/prepare-browser.mjs --clean.");
