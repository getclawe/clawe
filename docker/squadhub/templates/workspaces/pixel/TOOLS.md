# TOOLS.md — Local Notes

## Image Generation

Use the `openai-image-gen` skill for creating images. Read the skill's SKILL.md for full usage — OpenClaw resolves the script path automatically.

Quick reference (the skill handles paths):

- GPT image models: `--model gpt-image-1` (recommended, supports multiple images)
- DALL-E 3: `--model dall-e-3` (1 image at a time, good for hero images)
- Key flags: `--prompt`, `--count`, `--size`, `--quality`, `--out-dir`

Output: images + `prompts.json` + `index.html` gallery.

## Asset Specs

- Hero images: 1792x1024 or 1536x1024
- Social preview: 1200x630
- Diagrams: As needed, clean and minimal

## Design Guidelines

_Add brand colors, fonts, style preferences here._

---

Add whatever helps you do your job.
