# Vortex — Interactive Polar Shader Lab

An interactive WebGL fragment shader playground and real-time audio-reactive visual synthesizer featuring mouse-driven polar tunnel distortion, 31 modular raymarched and 2D procedural layers, negative-space compositing, multi-pass optical post-processing, smooth preset crossfading, and live GLSL export.

## 🌐 Live Site

- **GitHub Pages:** [https://whatsinmyopsec.github.io/vortex/](https://whatsinmyopsec.github.io/vortex/)

---

## ✨ Key Features

- **31 Modular GLSL Shader Layers:** Combine, parameterize, and reorder 31 procedural fragment & 3D/4D raymarched layers:
  1. *Polar Harmonic Tunnel*
  2. *Voronoi Cellular Ridge*
  3. *Orbital Starfield Drift*
  4. *FBM Nebula & Aurora Clouds*
  5. *Event Horizon Accretion Disk*
  6. *Truchet Cyber-Conduit Lattice*
  7. *Neon Plasma Wave Caustics*
  8. *Animated Julia Set Fractal*
  9. *Bioluminescent Turing Coral*
  10. *Kaleidoscopic IFS Mandala*
  11. *Iridescent Ferrofluid Oil*
  12. *Hyperbolic 3D Gyroid Labyrinth*
  13. *Op-Art Moiré Interference*
  14. *Quasicrystal Penrose Light Web*
  15. *Chladni Acoustic Cymatics*
  16. *Clifford Strange Attractor*
  17. *4D Hypersphere Hopf Fibration*
  18. *Apollonian Kleinian Fractal*
  19. *Lissajous Laser Oscilloscope*
  20. *Cherenkov Hex-Warp Matrix*
  21. *Morphing Mandelbrot Zoom*
  22. *Recursive Circle Packing*
  23. *Pentagonal Wave Interference*
  24. *Kaleidoscopic IFS Crystal*
  25. *Logarithmic Spiral Vortex*
  26. *4D Kleinian Inversion Lattice (Pure 4D Spherical Inversion)*
  27. *PS2 BIOS Crystal Towers & 7-Orb Nebula*
  28. *PS2 VLM Waveform Ribbon & Spectrum Horizon*
  29. *Neon Crystal Ice Corridor*
  30. *Rotating Neon Triangle Portal* *(Default startup preset)*
  31. *3D Kleinian Sphere Packing*

- **Post-Processing & Optical FX Pipeline (`Post-FX`):**
  - **Kick & Bass Camera Zoom Punch:** Transient-detected sub-bass/kick optical zoom punch (`uBassZoom`) that scales the viewport inward on every drum hit (up to 45% optical magnification) without stretching or distorting aspect ratio.
  - **Vignette & Lens Breathing (Dark Corners):** Anamorphic 4-corner and radial lens falloff with subtle focal-length breathing modulated by time and bass transients.
  - **5-Tap Spectral Prism Chromatic Aberration:** Radial RGB prism dispersion across both the live shader pass and temporal feedback trails, dynamically boosted on bass kicks.
  - **Ping-Pong Temporal Motion Trails & Zoom Smear:** Multi-pass WebGL framebuffer persistence (`trailPersistence`) with beat-reactive radial zoom/swirl smear (`trailZoomWarp`).
  - **Display Grade & CRT Mask:** Optional Y2K Cobalt Color Matrix and Sony Trinitron aperture-grille phosphor scanlines.

- **Streamlined 5-Tab Control Deck:**
  - **Presets:** Curated visual presets with cosine-eased crossfade duration controls, **VJ Auto-Cycle**, and one-click **Randomize**.
  - **Layers:** Compact auto-collapsing layer cards (`All (31)` vs `Active` filter + instant search), negative-space priority chain reordering, per-layer sub-parameter drawers, and LFO modulation.
  - **Post-FX:** Dedicated optical post-processing rack for camera zoom punch, vignette breathing, chromatic aberration, temporal motion trails, and display grading.
  - **Warp:** Polar coordinate distortion, Mouse Follow (`M` key), Lock & Center at `(0,0)` (`C` key), and Negative-Space Carving controls.
  - **GLSL:** Real-time standalone Shadertoy-compatible GLSL code generator with one-click copy.

- **Negative-Space Layer Stack:** Foreground layers carve luminance masks for lower layers in the priority chain, enabling deep multi-layer compositions without muddy additive over-blending.

- **Live Audio-Reactive Engine & SomaFM Streaming:**
  - Streams **Synphaera (SomaFM)** by default (`https://ice1.somafm.com/synphaera-128-mp3`), alongside one-click stations (*Beat Blender*, *The Trip*, *CLIQHOP idm*, *Def Con Radio*, *Suburbs of Goa*, *Space Station Soma*, *Vaporwaves*).
  - Supports external song & stream URLs (SomaFM, direct MP3/WAV/OGG/AAC streams) as well as built-in procedural Web Audio synthesis.
  - Real-time 3-band FFT frequency analysis (**Bass**, **Mid**, **High**), sub-bass transient kick detection, and live onset-based **BPM detection** that drives shader speed and camera zoom punch.

- **15s GIF / 60 FPS Video Capture & Live GLSL Export:** Record 15-second animated GIFs or 60 FPS WebM/MP4 video loops (with live stereo audio muxed directly from the Web Audio graph), or copy the generated standalone GLSL fragment shader at any time.

---

## 🚀 Local Development

### Prerequisites

- **Node.js** 18+ and **npm**

### Setup & Run

```bash
# Install dependencies
npm install

# Start the development server (runs on http://localhost:3000)
npm run dev
```

### Build for Production / GitHub Pages

```bash
npm run build
```

The static production bundle is output to `./dist` with relative asset paths (`base: './'`), ready for GitHub Pages or any static host.
