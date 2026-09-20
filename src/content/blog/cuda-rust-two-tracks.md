---
title: "CUDA Rust, two tracks"
date: 2026-09-20
tags:
  - cuda
  - rust
  - gpu
summary: "NVIDIA's September post: C++ and Python stay the mature kernel languages. They're adding native Rust so the serving stack and the kernel can share a language."
---

Sri Koundinyan, Melih Elibol, and Jonathan Bentz published [Introducing CUDA Rust: Two Tracks for Writing GPU Kernels](https://developer.nvidia.com/blog/introducing-cuda-rust-two-tracks-for-writing-gpu-kernels/) on 8 September 2026. CUDA C++ and CUDA Python are mature, enterprise-grade toolchains. Now, NVIDIA is growing CUDA Rust into 2027 and beyond.

## The languages that already ship kernels

If you want a function to run on an NVIDIA GPU, you write a kernel. Host code on the CPU sets up buffers and launches it. The device code, or kernel, is thousands of threads running on the GPU. The working set lives in HBM for the length of the job. When the kernel dies, that copy is gone unless you landed it somewhere durable.

CUDA started as C++, and that's still the language the mature toolchain is built around. You say what one thread does, you launch a grid, you manage shared memory and indexes yourself. That's SIMT, and it's how a lot of production kernels still look. Python got a first-class seat later because research and serving already live there: `numba-cuda`, CUDA Python, and the rest of the stack that lets you stay in a notebook until the kernel has to be fast. NVIDIA says both of those frontends are enterprise-grade. That's the standard. If you're writing a kernel in 2026 and you need something you can staff, debug, and ship, you're probably in C++ or Python.

Rust has been showing up next door. NVIDIA's Nova Linux driver is Rust. NVIDIA Dynamo is built on a Rust core. NVTX has Rust bindings. Inference engines, serving infrastructure, and agent runtimes churn as models change, and more of that systems layer is in Rust because it catches whole classes of bugs at compile time without giving up the speed those services need. The gap NVIDIA is naming is simple: you could launch kernels *from* Rust, and the kernel itself often had to be written in another language. CUDA Rust is them closing that, compiling Rust to PTX instead of wrapping a C++ file you keep in a different crate.

## Two tracks, same GPU

CUDA itself already has two programming models, and the Rust work matches them.

**SIMT** is the model you already write in CUDA C++ or numba-cuda. You indicate what one thread does, and you launch thousands of them. The Rust project for that track is [cuda-oxide](https://github.com/NVlabs/cuda-oxide): a custom `rustc` codegen backend that routes `#[kernel]` functions through Rust MIR, the community Pliron IR, and LLVM down to PTX. Host and device code can live in one file. The catch is the toolchain. Linux, compute capability 8.0 or later, CUDA 12.x or newer, a pinned nightly, clang, and often LLVM. `cargo oxide doctor` checks it. NVIDIA calls this early alpha.

**Tile** is newer, and it's also in C++ and Python, so this isn't a Rust-only idea. You say what one tile of data does, and the Tile IR compiler decides how that maps onto real threads and memory. The Rust project is [cutile-rs](https://github.com/NVlabs/cutile-rs). Stable Rust 1.89+, CUDA 13.3, no custom LLVM, published on crates.io. NVIDIA's advice when you're picking a model: reach for Tile first, drop to SIMT when you need to manage memory and threads yourself.

They walk the same 1,024-float elementwise add on both tracks. The interesting part is the type system doing a job C++ usually leaves to reviews and sanitizers. On SIMT, the output buffer is a `DisjointSlice` because a plain `&mut [f32]` would mean every thread needs the same mutable borrow, which Rust refuses. On Tile, you partition a mutable tensor on the host so each tile owns a chunk, and `&mut` is enough. Passing the output as one of its own inputs doesn't compile on either track. NVIDIA's point is that thousands of threads hitting the same buffers in no guaranteed order is the kind of bug that passes tests and then fails in production, and they'd rather the compiler stop the classic aliasing mistake before you ever get a wrong sum.

Language and model are separate questions. Use the CUDA exposure that fits the stack you already have. NVIDIA says they plan interop between CUDA Rust, CUDA C++, and CUDA Python so picking Rust doesn't lock you out of the other two.

## What this is for, if you're in AI

The kernel is the expensive inner loop of training and inference. Weights and activations live in HBM while that loop runs. Serving stacks like Dynamo already want Rust for the process around the GPU: scheduling, routing, the parts that shouldn't segfault because a pointer got reused. HuggingFace's Grout inference engine and mistral.rs are already using cutile-rs, which is NVIDIA's evidence that this isn't only a compiler demo.

If the kernel can be Rust too, the serving process and the GPU program can share one language, one crate graph, and one set of ownership rules. That's useful when the product is an inference engine that has to stay up while models and techniques change. It doesn't make C++ or Python the wrong choice for a kernel you already have. NVIDIA is explicit that those toolchains stay, and that both Rust projects are early. cuda-oxide is early alpha. cutile-rs is further along and still not production-ready. APIs will move.

What supporting Rust *does* change is who can write the GPU part of an AI stack without a second language, and how many of those races get caught at compile time instead of at 3 a.m. on a cluster. For GPUs, it means CUDA is growing another frontend rather than replacing the ones that already ship. For AI, it means the systems layer that's been drifting into Rust can keep drifting all the way to PTX, with Tile as the default and SIMT when you need the knobs.

I still wouldn't staff a production kernel in cuda-oxide tomorrow. I'd watch cutile-rs if the rest of the service is already Rust, and I'd keep C++ and Python as the languages I expect to see in a statement of work for a kernel that has to land this year.

## Sources

- Sri Koundinyan, Melih Elibol, and Jonathan Bentz, [Introducing CUDA Rust: Two Tracks for Writing GPU Kernels](https://developer.nvidia.com/blog/introducing-cuda-rust-two-tracks-for-writing-gpu-kernels/), NVIDIA Technical Blog, 8 September 2026
- [cuda-oxide](https://github.com/NVlabs/cuda-oxide)
- [cutile-rs](https://github.com/NVlabs/cutile-rs)
