# Text-o-Matic icon files

Drop these PNG files into this folder using these exact names:

| Filename | Size | Purpose |
| --- | ---: | --- |
| `favicon-16.png` | 16×16 | Small browser favicon |
| `favicon-32.png` | 32×32 | Standard browser favicon |
| `apple-touch-icon.png` | 180×180 | iPhone/iPad home-screen icon |
| `icon-192.png` | 192×192 | Required PWA install icon |
| `icon-512.png` | 512×512 | Required PWA install/high-resolution icon |
| `icon-maskable-512.png` | 512×512 | Android/adaptive maskable PWA icon |

`source-logo.png` is the generated source artwork included for convenience.

## Maskable icon note

For `icon-maskable-512.png`, keep the important part of the logo comfortably inside the center safe area. A maskable icon can be cropped into a circle, rounded square, or other platform shape, so give the mark extra padding rather than letting important details reach the edges.

The ordinary `icon-192.png` and `icon-512.png` can use the normal square icon treatment. For broad PWA compatibility, a solid background is safer than relying on transparency.
