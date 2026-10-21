---
title: "rsync: backing up a wedding dump"
date: 2026-09-19
tags:
  - infrastructure
summary: "A year later we got the RAW photos and video on a 1TB SSD. Finder would have been hours with no gui copy feature I trusted to resume, so I used caffeinate and rsync."
---

A terabyte wedding dump between two SSDs on one Mac hits a ceiling GUI copy was not built for: hours on the clock, laptop sleep, cable wiggles, Spotlight indexing the destination while writes land, and no resume story worth trusting when the transfer dies mid-tree. Selecting a folder and copying does not put a terabyte on the clipboard—the clipboard gets paths and a file promise, then Finder walks file by file. That is the right tool for a folder of PDFs; a tree that almost fills a 1TB SSD of RAWs and video is a different job. Monterey added a resume control on a greyed-out copy; a grey folder still is not the only copy of the day.

Picture two volumes—master and backup—and a copy that has to survive idle sleep. The working set is whatever is in flight; the envelope is what still exists after power cut or disconnect. rsync plus `caffeinate` is how the envelope gets landed.

## Finder copy and rsync answer different failure modes

Finder wants the copy to look finished. rsync is built to be rerun. After a disconnect, scroll the log, see the last file that landed, and start the same command. `-a` plus a second pass skips files that already match size and time. `--partial` means the file that died mid-write is still there to finish.

The terminal stays one session. No copy window that loses its place if the lid closes wrong. `--progress` is noisy on purpose—silence is how you discover at midnight that sleep won.

## The command we used

```sh
caffeinate -i rsync -aW --progress --partial \
  --exclude '.Spotlight-V100' --exclude '.fseventsd' --exclude '.Trashes' --exclude '.DS_Store' \
  "/Volumes/master-wedding/our-wedding" \
  "/Volumes/backup-wedding/our-wedding"
```

One pane. A log. If it stops, run the same line again.

## What those flags buy on local SSDs

`caffeinate -i` is an idle-sleep assertion. The copy is allowed to take all evening. The machine isn't allowed to nap in the middle of a large file.

`-a` is archive: recursive, times, permissions, symlinks. The backup should look like the master, not a flattened dump of whatever Finder decided to flatten.

`-W` is whole-file. rsync can send only the bytes that changed by walking a rolling checksum, which is worth it over a slow network. Two SSDs on one Mac don't need that. Read the file, write the file, skip the extra CPU.

`--progress` prints the filename and the bytes, so the current file is visible—still or long clip. Finder's bar is one number for the whole tree.

`--partial` keeps an interrupted file on the destination. Default rsync throws the temp file away on a dirty exit, and the next run starts that file at byte zero. With `--partial`, a later run can continue. Resume is running the same command.

The `--exclude` lines are volume junk, not wedding files. `.Spotlight-V100` is the index. If Spotlight is building that on the destination while rsync writes photos, you have two writers on the same flash. `.fseventsd` is the FSEvents log. `.Trashes` is the volume trash. `.DS_Store` is Finder chrome. None of that is the day.

Disabling Spotlight on the backup volume in System Settings is the other half of that. The excludes keep those metadata directories from being copied over as if they were content.

## HBM is the working set; the SSD is the envelope

Training boxes live with the same split at a different scale. There's a working set that's gone if the job dies, and there's an envelope that still exists in the morning. The wedding dump is the envelope. rsync is how the bytes land on something that survives a power cut.

HBM is the working set—the photos Lightroom actually has open. NVIDIA's [H100 SXM](https://www.nvidia.com/en-us/data-center/h100/) is 80GB of HBM3 at 3.35 TB/s, so weights and activations live there and move around at that speed. Run the same 1TB folder through that memory and you'd be done in about 0.3 seconds—a silly comparison until you remember what happens next: when the job dies, that copy is gone. 80GB also can't hold the day. The RAWs don't fit in Lightroom's open set, and they don't fit in an H100 either.

The Amazon SSD is the envelope: the 1TB dump, the checkpoint you can reload, the tokenized corpus, and in some serving setups the KV cache spilled off the GPU. Flash is slower and much larger, and it's the copy that still exists in the morning—which is why a second drive beat trusting whatever was in RAM.

The numbers get cartoonish if you keep walking up the rack. An [HGX B200 node](https://docs.nvidia.com/enterprise-reference-architectures/hgx-ai-factory/latest/components.html) is 1.44 TB of HBM at up to 64 TB/s across the eight GPUs. A [GB200 NVL72](https://www.nvidia.com/en-us/data-center/gb200-nvl72/) rack is 13.4 TB of HBM3e at 576 TB/s of GPU memory bandwidth, with 130 TB/s of NVLink inside the 72-GPU domain. NVIDIA's write-up on that machine puts a 576-GPU NVLink domain at [1 PB/s](https://developer.nvidia.com/blog/nvidia-gb200-nvl72-delivers-trillion-parameter-llm-training-and-real-time-inference/) aggregate. That's chip fabric, not USB. At 1 PB/s, a 1TB folder is a thousand copies per second on that fabric—a fun way to feel poor about a USB cable, and it still doesn't replace the envelope. 13.4 TB of HBM3e can't hold the internet either, so training still needs the SSDs.

The USB copy still takes hours because the job is not on that fabric. Someone still has to land the bytes on something that survives a power cut. rsync is for that part.

## Verifying the copy landed

rsync’s exit code is the first gate: zero means the run finished without rsync reporting a transfer error. It does not prove every wedding file is bitwise identical—you still want a spot check that ignores Finder’s “looks done” bar.

After the first full pass (or after a resume), compare tree size on both volumes:

```sh
du -sh "/Volumes/master-wedding/our-wedding" "/Volumes/backup-wedding/our-wedding"
```

The numbers should match within rounding; a large gap usually means the run stopped early or an exclude hid more than junk.

For a deeper check without re-copying everything, ask rsync to compare metadata and report differences only:

```sh
rsync -aWn --delete \
  --exclude '.Spotlight-V100' --exclude '.fseventsd' --exclude '.Trashes' --exclude '.DS_Store' \
  "/Volumes/master-wedding/our-wedding/" \
  "/Volumes/backup-wedding/our-wedding/"
```

`-n` is dry-run. An empty report (or only the expected junk paths) means the backup tree matches the master under archive rules. Drop `-n` only if you intend to delete extras on the destination—leave it off for a wedding backup unless you are sure nothing landed on the backup drive that is not on the master.

Spot-check a few large files manually: pick one long video and one heavy RAW folder, compare byte size with `stat -f%z` on macOS or `ls -l`, and open one clip from the backup volume in Photos or QuickTime. USB bridges and sleep are where silent truncation shows up; `--partial` helps resume, but verification is still your job.

If you rerun the original `caffeinate` command after a disconnect, watch the progress lines: already-matched files should fly past quickly. A full re-read of every file on every run means something changed (clock skew, permission bits, or a flag mismatch)—worth fixing before you unplug the backup SSD.

## Sources

- [rsync(1)](https://download.samba.org/pub/rsync/rsync.1): `--partial`, `--whole-file`, archive mode
- [caffeinate(8)](https://www.unix.com/man-page/osx/8/caffeinate/): `-i` idle sleep
- [H100](https://www.nvidia.com/en-us/data-center/h100/): 80GB HBM3, 3.35 TB/s
- [HGX AI Factory components](https://docs.nvidia.com/enterprise-reference-architectures/hgx-ai-factory/latest/components.html): B200 node HBM and aggregate bandwidth
- [GB200 NVL72](https://www.nvidia.com/en-us/data-center/gb200-nvl72/): 13.4 TB HBM3e, 576 TB/s, 130 TB/s NVLink
- [NVIDIA Technical Blog on GB200 NVL72](https://developer.nvidia.com/blog/nvidia-gb200-nvl72-delivers-trillion-parameter-llm-training-and-real-time-inference/): 1 PB/s on a 576-GPU NVLink domain
