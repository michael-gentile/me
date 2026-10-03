---
title: "Ship a tiny tool without shipping Node"
date: 2026-10-03
tags:
  - typescript
  - tooling
summary: "Vercel Labs' scriptc turns a typed TypeScript file into a standalone binary. Coverage tells you when you're still dragging a JS engine along."
---

I keep a pile of useful TypeScript scripts that only become painful when someone else has to run them. Install Node. Match the version. `npm install`. Hope `node_modules` survives the flight. For a ten-line helper, that tax is silly.

[scriptc](https://github.com/vercel-labs/scriptc) is an experimental compiler from Vercel Labs that aims at a different deliverable: a normal executable. TypeScript (or JavaScript) in, native binary or WebAssembly out. On a fully static program, there is no Node process and no embedded JavaScript engine at runtime.

I am not rewriting a web app in this. I am asking whether the next small CLI can leave the house as `./tool`.

## A hello that becomes a binary

Their docs start with the obvious program. I ran the same shape locally:

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

On my Mac that `hello` landed around 380 KB. You need a platform linker and SDK for executable builds (Xcode Command Line Tools on macOS). Install still wants Node 24+ for the npm package; the *output* does not.

`scriptc run hello.ts` compiles and executes in one step if you do not care about keeping the binary.

## Coverage before you get attached

The part I care about more than the hello is `scriptc coverage`. It answers a product question: how much of *this* file goes native, and what still needs a JS engine?

Import something from npm, like `picocolors`, and the report changes:

```console
$ npx scriptc coverage cli.ts

  statements analyzed   1
  compile statically    0  (0%)

  runs with --dynamic   2 sites
      ×1  importing 'picocolors' requires the embedded dynamic engine ...  SC2013
```

`--dynamic` embeds [quickjs-ng](https://github.com/quickjs-ng/quickjs) and packages the dependency's JavaScript into the binary so you are not reading `node_modules` at runtime. With `--dynamic`, coverage on that same file said it could build; the sites become "islands" the engine runs.

That first build of the embedded engine wanted CMake on my PATH. Static `hello` did not. The docs are clear that enabling `--dynamic` also does not magically support every API the static compiler refuses. Unsupported stays unsupported; you get an `SC` diagnostic, not a shrug at runtime.

So the workflow I would actually use is boring: write the tool, run coverage, decide whether `--dynamic` is acceptable, then build.

## When I would reach for it

- A one-file CLI you can email or drop on a jump box
- A tiny local HTTP helper that only needs the Node APIs scriptc already implements natively
- A WASI module when the docs' WebAssembly path matches the host you care about

I would not start here for a Next.js app, a thick Electron shell, or anything that is really "half of npm plus some glue." The project says it is experimental and supports a subset of JS, TypeScript, and Node. Their [limitations](https://scriptc.dev/docs/limitations) and [compatibility](https://scriptc.dev/compatibility) pages are the real README for an existing codebase.

## Next to Bun and Deno

Bun and Deno still run a JavaScript runtime when you ship them. scriptc is trying something else: typed, restricted TypeScript compiled ahead of time, with `coverage` as the scoreboard. When you fall off that surface, you opt into an embedded engine on purpose.

For the next helper that types cleanly and stays fully static, I'd try handing someone `./tool` before I write another "install Node" README.

## Sources

- [vercel-labs/scriptc](https://github.com/vercel-labs/scriptc)
- [scriptc docs](https://scriptc.dev/docs)
- [Quickstart](https://scriptc.dev/docs/quickstart)
- [Coverage reports](https://scriptc.dev/docs/coverage)
- [Limitations](https://scriptc.dev/docs/limitations)
- [How it works](https://scriptc.dev/docs/how-it-works)
