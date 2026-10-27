---
title: "CUDA Rust: two tracks for GPU kernels"
date: 2026-09-20
tags:
  - infrastructure
  - programming
summary: "NVIDIA's September post: C++ and Python stay the mature kernel languages. They're adding native Rust so the serving stack and the kernel can share a language."
---

Every Rust inference service eventually hits the same seam: Dynamo, mistral.rs, and the agent runtimes compile and schedule in Rust, then hand a `.cu` or a Python kernel file to a second toolchain for the device code. That split is workable until ownership rules, crate graphs, and on-call debugging span two languages for one hot loop. [Introducing CUDA Rust: Two Tracks for Writing GPU Kernels](https://developer.nvidia.com/blog/introducing-cuda-rust-two-tracks-for-writing-gpu-kernels/) (Sri Koundinyan, Melih Elibol, Jonathan Bentz, 8 September 2026) is NVIDIA's plan to compile Rust to PTX on two tracks—SIMT through cuda-oxide and Tile through cutile-rs—while C++ and Python remain the mature kernel frontends through 2027 and beyond.

Picture a serving binary that already owns buffers and launch queues in Rust. Today the kernel often lives in another crate written in CUDA C++ or numba-cuda. CUDA Rust is the bet that the process around the GPU and the program on the GPU can share one language and one borrow checker instead of reviews and sanitizers catching aliasing after the fact.

Below: what already ships kernels, how the two Rust tracks map to SIMT and Tile, what changes for AI stacks, and where the toolchains still say "early."

## C++ and Python are still the staffed default

If a function must run on an NVIDIA GPU, you write a kernel. Host code on the CPU sets up buffers and launches it. The device code is thousands of threads; the working set lives in HBM for the length of the job. When the kernel finishes, that copy is gone unless something durable captured it.

CUDA started as C++. One thread's logic, a grid launch, shared memory and indexes managed by hand—that SIMT shape is still how a lot of production kernels look. Python joined as a first-class frontend because research and serving already live there: `numba-cuda`, CUDA Python, notebooks until the kernel has to be fast. NVIDIA calls both frontends enterprise-grade—the bar for staffing, debugging, and shipping in 2026.

Rust has been adjacent for years: Nova Linux driver in Rust, Dynamo on a Rust core, NVTX bindings. Inference engines and agent runtimes churn as models change; more of that systems layer is Rust because it catches whole classes of bugs at compile time without giving up the speed those services need. The gap NVIDIA names is narrow but painful: launch kernels *from* Rust, write the kernel itself in another language. CUDA Rust closes that by compiling Rust to PTX instead of permanently wrapping a C++ translation unit in a different crate.

## SIMT and Tile get matching Rust frontends

CUDA already exposes two programming models; the Rust work mirrors both.

**SIMT** is the model CUDA C++ and numba-cuda use today. Describe one thread, launch thousands. The Rust project is [cuda-oxide](https://github.com/NVlabs/cuda-oxide): a custom `rustc` codegen backend routing `#[kernel]` functions through Rust MIR, the community Pliron IR, and LLVM to PTX. Host and device can share a file. The cost is toolchain weight: Linux, compute capability 8.0+, CUDA 12.x+, pinned nightly, clang, often LLVM. `cargo oxide doctor` checks the stack. NVIDIA labels this early alpha.

**Tile** is newer and exists in C++ and Python too—not Rust-only. Describe one tile of data; Tile IR decides thread and memory mapping. The Rust project is [cutile-rs](https://github.com/NVlabs/cutile-rs): stable Rust 1.89+, CUDA 13.3, no custom LLVM, on crates.io. NVIDIA's pick order: Tile first, SIMT when memory and threads need manual control.

Both tracks walk the same 1,024-float elementwise add. The type system does work C++ usually leaves to review. On SIMT, the output buffer is a `DisjointSlice` because plain `&mut [f32]` would imply every thread holds the same mutable borrow—which Rust rejects. On Tile, partition a mutable tensor on the host so each tile owns a chunk and `&mut` suffices. Feed the output as one of its own inputs and neither track compiles. Thousands of threads touching buffers in no guaranteed order is the bug that passes tests and fails in production; NVIDIA would rather the compiler block classic aliasing before a wrong sum ships.

Language and model are separate choices. Pick the CUDA exposure that fits the stack in hand. NVIDIA plans interop among CUDA Rust, CUDA C++, and CUDA Python so Rust does not lock out the other two.

## The kernel is still the expensive inner loop

Training and inference spend their time in kernels. Weights and activations sit in HBM while that loop runs. Serving stacks like Dynamo already want Rust for scheduling, routing, and the parts that should not segfault on a reused pointer. HuggingFace's Grout inference engine and mistral.rs already use cutile-rs—evidence beyond a compiler demo.

When the kernel can be Rust too, the serving process and the GPU program share one language, one crate graph, one ownership model. That matters for inference engines that must stay up while models and techniques change. It does not retroactively wrong-foot a C++ or Python kernel that already ships. NVIDIA is explicit: those toolchains stay; both Rust projects are early. cuda-oxide is early alpha; cutile-rs is further along and still not production-ready. APIs will move.

Supporting Rust changes who can write the GPU slice of an AI stack without a second language, and how many races land at compile time instead of on a cluster at 3 a.m. For GPUs, CUDA grows another frontend rather than replacing the ones that ship today. For AI, the systems layer drifting into Rust can drift all the way to PTX—Tile as default, SIMT when the knobs matter.

For a greenfield kernel tomorrow, C++ and Python remain the languages to expect if something must land this year. cuda-oxide is watch-list; cutile-rs is the track to trial when the service around the GPU is already Rust.

## What to verify before you trust a Rust kernel

Early alpha means the compiler can say yes while the hardware story is still wrong. Before you merge a CUDA Rust kernel into a serving path, run the toolchain’s own health checks and one numerical gate on real silicon.

On the SIMT track, NVIDIA documents `cargo oxide doctor` against pinned nightly, CUDA 12.x+, and compute capability 8.0+. Treat a failing doctor as a hard stop—PTX that builds but targets the wrong SM version fails at load time with errors that look like driver bugs. On Tile, cutile-rs targets stable Rust 1.89+ and CUDA 13.3; confirm those versions in CI the same way you pin a CUDA base image for C++ kernels.

Reproduce NVIDIA’s elementwise add on your GPU, then add checks a demo skips:

```text
same input → same output on repeated launches (deterministic mode where supported)
output buffer not read until the launch queue signals completion
deliberate aliasing in source → compile error on both tracks (DisjointSlice / tile partition)
```

Compare against a known-good reference: the same shape implemented in CUDA C++ or cuBLAS for one size, one dtype. Match within float tolerance for `f32`; if they diverge, bisect with smaller tensors before you trust the Rust path on production batch sizes.

Profile one kernel the way on-call will: Nsight Systems or Compute on the Rust-built module, confirm occupancy and shared-memory usage are in the same ballpark as the C++ baseline. A compile-time borrow check does not catch bank conflicts or uncoalesced loads—that still shows up in the profiler.

Document which track you chose and why in the crate README. Interop with existing `.cu` crates is part of the story; “all Rust” is not a free upgrade if the hot loop still dispatches through a foreign-function boundary you never measured.

## Sources

- Sri Koundinyan, Melih Elibol, and Jonathan Bentz, [Introducing CUDA Rust: Two Tracks for Writing GPU Kernels](https://developer.nvidia.com/blog/introducing-cuda-rust-two-tracks-for-writing-gpu-kernels/), NVIDIA Technical Blog, 8 September 2026
- [cuda-oxide](https://github.com/NVlabs/cuda-oxide)
- [cutile-rs](https://github.com/NVlabs/cutile-rs)
- Related: [Astro: the stack behind this site](/me/blog/the-stack-behind-this-site/), [scriptc: ship a tiny tool without shipping Node](/me/blog/ship-a-tiny-tool-without-shipping-node/)
