---
title: "rsync for a wedding dump"
date: 2026-09-19
tags:
  - rsync
  - macos
  - storage
summary: "A year later we got the RAW photos and video on a 1TB SSD. Finder would have been hours with no gui copy feature I trusted to resume, so I used caffeinate and rsync."
---

After more than a year we got the RAW photos and video from our wedding, on a 1TB SSD. First thought: back it up. My Macbook was already tight on space, so I bought the same 1TB drive on Amazon. It happened to be on sale. Sale on memory doesn't mean much anymore, but the box showed up.

I could have plugged both drives in, copy, paste, badaboom badabing. That would have taken hours. On my version of macOS I didn't have a gui copy feature I trusted to continue where it left off if the transfer died, so I didn't use Finder.

## What paste actually does

Selecting a folder and copying it doesn't put a terabyte on the clipboard. The clipboard gets a list of paths, a file promise, and then Finder walks the tree: open a file, read it into kernel buffers, write the destination, copy timestamps and permissions, next file.

That's the right tool for a folder of PDFs. You get a progress window, human-readable names, and undo, and a small folder finishes while you make tea.

A tree that almost fills a 1TB SSD is a different job. RAWs and video, hours of wall clock. My laptop may sleep, a cable can wiggle, Spotlight starts indexing the destination while you're still writing it, and USB can hiccup. Monterey added a resume control on a greyed-out copy. I still didn't want a grey folder as the only copy of our wedding.

## The command

```sh
caffeinate -i rsync -aW --progress --partial \
  --exclude '.Spotlight-V100' --exclude '.fseventsd' --exclude '.Trashes' --exclude '.DS_Store' \
  "/Volumes/master-wedding/our-wedding" \
  "/Volumes/backup-wedding/our-wedding"
```

One pane. A log. If it stops, I run the same line again.

## Why those flags

`caffeinate -i` is an idle-sleep assertion. The copy is allowed to take all evening. The machine isn't allowed to nap in the middle of a large file.

`-a` is archive: recursive, times, permissions, symlinks. The backup should look like the master, not a flattened dump of whatever Finder decided to flatten.

`-W` is whole-file. rsync can send only the bytes that changed by walking a rolling checksum, which is worth it over a slow network. Two SSDs on one Mac don't need that. Read the file, write the file, skip the extra CPU.

`--progress` prints the filename and the bytes, so I can see whether the current file is a still or a long clip. Finder's bar is one number for the whole tree.

`--partial` keeps an interrupted file on the destination. Default rsync throws the temp file away on a dirty exit, and the next run starts that file at byte zero. With `--partial`, a later run can continue. Resume is running the same command.

The `--exclude` lines are volume junk, not our wedding files. `.Spotlight-V100` is the index. If Spotlight is building that on the destination while rsync writes photos, you have two writers on the same flash. `.fseventsd` is the FSEvents log. `.Trashes` is the volume trash. `.DS_Store` is Finder chrome. None of that is the day.

Disabling Spotlight on the backup volume in System Settings is the other half of that. The excludes keep those metadata directories from being copied over as if they were content.

## Resume and a clean terminal

Finder wants the copy to look finished. rsync is built to be rerun. After a disconnect I scroll the log, see the last file that landed, and start the same command. `-a` plus a second pass skips files that already match size and time. `--partial` means the file that died mid-write is still there to finish.

The terminal stays one session. No copy window that loses its place if I close the lid wrong. `--progress` is noisy on purpose. I want the noise, because silence is how you discover at midnight that sleep won.

## The same job, at the other end of the building

I was staring at two SSDs and a copy that had to survive the laptop sleeping, and that's the same split training boxes live with, just at a different scale. There's a working set that's gone if the job dies, and there's an envelope that still exists in the morning. Our wedding dump is the envelope. rsync is how I land it.

HBM is the working set, the photos Lightroom actually has open. NVIDIA's [H100 SXM](https://www.nvidia.com/en-us/data-center/h100/) is 80GB of HBM3 at 3.35 TB/s, so the weights and activations live there and move around at that speed. Run the same 1TB folder of our wedding through that memory and you'd be done in about 0.3 seconds, which is a silly comparison until you remember what happens next: when the job dies, that copy is gone. 80GB also can't hold the day. The RAWs don't fit in Lightroom's open set, and they don't fit in an H100 either.

The Amazon SSD is the envelope: the 1TB dump, the checkpoint you can reload, the tokenized corpus, and in some serving setups the KV cache spilled off the GPU. Flash is slower and much larger, and it's the copy that still exists in the morning, which is why I bought the second drive instead of trusting whatever was in RAM.

The numbers get cartoonish if you keep walking up the rack. An [HGX B200 node](https://docs.nvidia.com/enterprise-reference-architectures/hgx-ai-factory/latest/components.html) is 1.44 TB of HBM at up to 64 TB/s across the eight GPUs. A [GB200 NVL72](https://www.nvidia.com/en-us/data-center/gb200-nvl72/) rack is 13.4 TB of HBM3e at 576 TB/s of GPU memory bandwidth, with 130 TB/s of NVLink inside the 72-GPU domain. NVIDIA's write-up on that machine puts a 576-GPU NVLink domain at [1 PB/s](https://developer.nvidia.com/blog/nvidia-gb200-nvl72-delivers-trillion-parameter-llm-training-and-real-time-inference/) aggregate. That's chip fabric, not USB. At 1 PB/s, a 1TB folder of our wedding is a thousand copies per second on that fabric, which is a fun way to feel poor about a USB cable, and it still doesn't replace the envelope. 13.4 TB of HBM3e can't hold the internet either, so training still needs the SSDs.

The USB copy still takes hours because I'm not on that fabric. Someone still has to land the bytes on something that survives a power cut. I used rsync for that part.

## Sources

- [rsync(1)](https://download.samba.org/pub/rsync/rsync.1): `--partial`, `--whole-file`, archive mode
- [caffeinate(8)](https://www.unix.com/man-page/osx/8/caffeinate/): `-i` idle sleep
- [H100](https://www.nvidia.com/en-us/data-center/h100/): 80GB HBM3, 3.35 TB/s
- [HGX AI Factory components](https://docs.nvidia.com/enterprise-reference-architectures/hgx-ai-factory/latest/components.html): B200 node HBM and aggregate bandwidth
- [GB200 NVL72](https://www.nvidia.com/en-us/data-center/gb200-nvl72/): 13.4 TB HBM3e, 576 TB/s, 130 TB/s NVLink
- [NVIDIA Technical Blog on GB200 NVL72](https://developer.nvidia.com/blog/nvidia-gb200-nvl72-delivers-trillion-parameter-llm-training-and-real-time-inference/): 1 PB/s on a 576-GPU NVLink domain
