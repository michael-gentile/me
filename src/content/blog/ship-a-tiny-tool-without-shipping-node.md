---
title: "scriptc: ship a tiny tool without shipping Node"
date: 2026-10-03
tags:
  - programming
summary: "Vercel Labs' scriptc turns a typed TypeScript file into a standalone binary. Coverage tells you when you're still dragging a JS engine along."
---

Every useful TypeScript helper eventually becomes someone else's install chore: match Node, run `npm install`, hope `node_modules` survives the jump box. For a ten-line CLI that tax is silly—the script was fine on the laptop that wrote it. [scriptc](https://github.com/vercel-labs/scriptc) is Vercel Labs' experimental compiler that turns a typed TypeScript file into a single native binary (or a WASI module) with no Node runtime in the deliverable. On a fully static program there is no Node process and no embedded JavaScript engine at runtime.

**Ahead-of-time (AOT) compilation**, here, means JavaScript semantics are lowered to native code before you ship, subject to scriptc's supported subset. **Dynamic remainder** is whatever the `coverage` report marks as needing the embedded **quickjs-ng** engine when you pass `--dynamic`. **Fully static** means 100% of analyzed statements compile without that engine—the binary you hand someone does not spawn V8 or Node.

Picture handing a colleague `./tool` instead of a README that starts with "install Node 24." That is the packaging story here—not rewriting a web app, just asking whether the next small CLI can leave the house as a binary.

## A hello that becomes an artifact

The docs start with the obvious program. The same shape runs locally:

```ts
const who: string = process.argv.length > 2 ? process.argv[2] : "world";
console.log(`hello, ${who}`);
```

```console
$ npx scriptc coverage hello.ts

  statements analyzed   2
  compile statically    2  (100%)

  fully static — this program has no dynamic remainder.

$ npx scriptc build hello.ts -o hello
$ ./hello scriptc
hello, scriptc
```

On macOS that `hello` landed around 380 KB. Executable builds need a platform linker and SDK (Xcode Command Line Tools on macOS). The npm package still wants Node 24+ for install; the *output* does not.

`scriptc run hello.ts` compiles and executes in one step when keeping the binary is optional.

### Worked example: argv, stdout, exit code

A slightly less trivial CLI might parse a flag and read a file:

```ts
import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("usage: checksum-file <path>");
  process.exit(1);
}
const buf = readFileSync(path);
console.log(buf.length);
```

Run `npx scriptc coverage checksum-file.ts` before you assume it is static. File I/O and `process.exit` are common in CLIs; scriptc's compatibility tables say whether each API is native or forces dynamic sites. If coverage reports dynamic imports or unsupported builtins, you decide: shrink the program, patch around the gap, or accept `--dynamic` and a larger binary.

Verification on the artifact:

```console
$ npx scriptc build checksum-file.ts -o checksum-file
$ ./checksum-file
usage: checksum-file <path>
$ echo $? 
1
$ ./checksum-file ./hello.ts
<number of bytes>
```

Ship the binary to a machine without Node. Re-run the same commands. If behavior diverges, you are still relying on dynamic islands or platform-specific paths—coverage and a clean static build are the goal.

## Coverage answers how much still needs a JS engine

The product question is not "can it build?" but "how much of *this* file goes native, and what remains dynamic?"

Import something from npm—`picocolors`—and the report shifts:

```console
$ npx scriptc coverage cli.ts

  statements analyzed   1
  compile statically    0  (0%)

  runs with --dynamic   2 sites
      ×1  importing 'picocolors' requires the embedded dynamic engine ...  SC2013
```

`--dynamic` embeds [quickjs-ng](https://github.com/quickjs-ng/quickjs) and packages the dependency's JavaScript into the binary so nothing reads `node_modules` at runtime. With `--dynamic`, coverage on that file still allows a build; the sites become islands the engine runs.

The first build of the embedded engine wanted CMake on PATH; static `hello` did not. Enabling `--dynamic` does not magically support every API the static compiler refuses—unsupported stays unsupported with an `SC` diagnostic, not a shrug at runtime.

The workflow that survives contact with reality: write the tool, run coverage, decide whether `--dynamic` is acceptable, then build.

### Reading SC diagnostics

**SC** codes are scriptc's static analysis errors: unsupported syntax, unknown globals, imports that cannot be bundled statically. Treat them like TypeScript errors—fix or redesign. Do not `--dynamic` your way past an API the project explicitly does not implement; the limitations doc is the boundary.

A practical rule: if dynamic sites cluster around one npm package, try inlining the ten lines you actually use (colors, a tiny parser) before embedding quickjs for all of `lodash`.

## When scriptc earns a slot in the toolbox

- A one-file CLI you can email or drop on a jump box
- A tiny local HTTP helper that only needs Node APIs scriptc already implements natively
- A WASI module when the docs' WebAssembly path matches the host

Do not start here for a Next.js app, a thick Electron shell, or anything that is half of npm plus glue. The project is experimental and supports a subset of JS, TypeScript, and Node. [Limitations](https://scriptc.dev/docs/limitations) and [compatibility](https://scriptc.dev/compatibility) are the real README for an existing codebase.

### Limits worth naming up front

- **Language surface.** Eval, dynamic `import()` with variable URLs, exotic proxies, and much of the long tail of npm assume a full Node runtime. scriptc is a compiler for restricted programs, not a drop-in Node replacement.
- **Platform matrix.** You build per OS/CPU (or WASI). Cross-compilation story follows the tool's docs; do not assume one macOS binary runs on Linux without a targeted build.
- **Build toolchain.** Native executables need a linker. CI images that only have Node for tests may need extra packages for release artifacts.
- **Experimental status.** APIs and diagnostics change between releases. Pin scriptc version in CI when you ship binaries to others.
- **Size versus static purity.** `--dynamic` increases binary size and attack surface (embedded interpreter). For security-sensitive jump boxes, prefer fully static tools even if you rewrite a dependency.

## scriptc is not "ship Bun"

Bun and Deno still run a JavaScript runtime when you ship them. scriptc tries something else: typed, restricted TypeScript compiled ahead of time, with `coverage` as the scoreboard. Falling off that surface means opting into an embedded engine on purpose.

Comparison in one sentence: shipping Bun means shipping a runtime that can run arbitrary JS; shipping a static scriptc binary means shipping only what the compiler proved it could lower—plus optional quickjs enclaves you explicitly accept.

## Verification checklist before you attach a binary to a release

1. `npx scriptc coverage <entry.ts>` — aim for 100% static unless you documented why not.
2. `npx scriptc build <entry.ts> -o <name>` on the same OS/arch as your users (or build matrix).
3. Run integration tests against the **binary**, not `tsx` or `node`, on a clean VM or container without Node.
4. Record scriptc version and whether `--dynamic` was used in release notes.
5. Scan binary size; a sudden 10× jump usually means dynamic bundling kicked in.

For the next helper that types cleanly and stays fully static, try `./tool` before writing another "install Node" README.

## Sources

- [vercel-labs/scriptc](https://github.com/vercel-labs/scriptc)
- [scriptc docs](https://scriptc.dev/docs)
- [Quickstart](https://scriptc.dev/docs/quickstart)
- [Coverage reports](https://scriptc.dev/docs/coverage)
- [Limitations](https://scriptc.dev/docs/limitations)
- [How it works](https://scriptc.dev/docs/how-it-works)
- Related: [CUDA Rust: two tracks for GPU kernels](/me/blog/cuda-rust-two-tracks/), [Astro: the stack behind this site](/me/blog/the-stack-behind-this-site/)
