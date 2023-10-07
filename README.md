# build-attach-xbe

Build an `attach.xbe` from a game's `default.xbe` with all game's info injected.

For XBE technical details see [here](http://www.caustik.com/cxbx/download/xbe.htm) or the PDF saved inside this repo.

The script will inject the full XBE manifest extracted from source xbe, and the XBX image (if present) into a newly-created `attach.xbe`. The `attach.xbe` used is the one contained inside Rocky5's Python script (and here we have some Frankenstein compiled JavaScript).

## Download

See GitHub [Releases](https://github.com/greguz/attach-xbe-builder/releases/latest).

## Usage

```
Usage:
  build-attach-xbe [...OPTIONS] [SOURCE FILE]

Options:
  -h,  --help                     Print this help text and exit.
  -o,  --output [TARGET FILE]     Output file path, defaults to attach.xbe.
  -v,  --version                  Print version information and exit.
```

When the `SOURCE FILE` is not defined, a raw `attach.xbe` is generated (without any injection).

## Build

```
npm i && npm run build
```

Used [rollup](https://rollupjs.org/) with [pkg](https://github.com/vercel/pkg) to generate the executables.

## FAQ

### It works?

Yup, tested (and currently using) with UnleashX and [LithiumX](https://github.com/Ryzee119/LithiumX). Both title names and images are showing up correctly.

### But I have a ISO file!

Use [extract-xiso](https://github.com/XboxDev/extract-xiso) to extract the whole game's content, or use [xbfuse](https://github.com/multimediamike/xbfuse) (Linux only) to mount the ISO and access the files directly. Redump-style ISOs are also supported by both those projects.

### I remember some JavaScript...

_Fear not_ my friend, your brain is working correctly.

See [v0.2.0](https://github.com/greguz/attach-xbe-builder/releases/tag/v0.2.0) release on GitHub.

### Coffee-time?

:)

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/greguz)


## Special thanks to

- Caustik and its very nice [XBE docs](http://www.caustik.com/cxbx/download/xbe.htm)
- Original [script](https://github.com/Rocky5/XBMC4Gamers/blob/master/Mod%20Files/system/scripts/XBMC4Gamers%20Extras/XISO%20to%20HDD%20Installer/default.py) by Rocky5
- [pyxbe](https://github.com/mborgerson/pyxbe) (testing out the result)
