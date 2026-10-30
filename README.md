# Vortex — Interactive Polar Shader Lab

An interactive WebGL fragment shader playground and real-time audio-reactive visual synthesizer featuring mouse-driven polar tunnel distortion, multi-layer negative-space compositing, smooth preset crossfading, and live GLSL uniform controls.

## 🌐 Live Site

- **GitHub Pages:** [https://whatsinmyopsec.github.io/vortex/](https://whatsinmyopsec.github.io/vortex/)

---

## ✨ Key Features

- **28 Modular GLSL Shader Layers:** Combine and reorder 28 procedural fragment layers including *Polar Harmonic Tunnel*, *Voronoi Cellular Ridge*, *Orbital Starfield Drift*, *FBM Nebula & Aurora Clouds*, *Event Horizon Accretion Disk*, *Truchet Cyber-Conduit Lattice*, *Neon Plasma Wave Caustics*, *Animated Julia Set Fractal*, *Bioluminescent Turing Coral*, *Kaleidoscopic IFS Mandala*, *Iridescent Ferrofluid Oil*, *Hyperbolic 3D Gyroid Labyrinth*, *Op-Art Moiré Interference*, *Quasicrystal Penrose Light Web*, *Chladni Acoustic Cymatics*, *Clifford Strange Attractor*, *4D Hypersphere Hopf Fibration*, *Apollonian Kleinian Fractal*, *Lissajous Laser Oscilloscope*, *Cherenkov Hex-Warp Matrix*, *Morphing Mandelbrot Zoom*, *Recursive Circle Packing*, *Pentagonal Wave Interference*, *Kaleidoscopic IFS Crystal*, *Logarithmic Spiral Vortex*, *4D Kleinian Inversion Lattice*, *PS2 BIOS Crystal Towers & 7-Orb Nebula*, and *PS2 VLM Waveform Ribbon & Spectrum Horizon*.
- **PlayStation 2 (PS2) BIOS & VLM Visualizer Mode:**
  - **Ping-Pong Temporal Motion Trail Feedback:** Multi-pass WebGL framebuffer persistence with beat-reactive radial zoom smear and subtle chromatic dispersion inspired by Jeff Minter's *Virtual Light Machine (VLM)* and the PS2 CD Audio Player.
  - **PS2 System BIOS & CD Player Layers:** 3D translucent cobalt-indigo monolithic crystal towers with the iconic 7 orbiting cyan light orbs + 5-plane 3D oscilloscope waveform ribbons and radial LED spectrum bars.
  - **Y2K Cobalt Color Matrix & Sony Trinitron CRT Mask:** Optional optical color grading and aperture-grille phosphor scanlines, plus **VJ Auto-Cycle** preset crossfading.
- **Negative-Space Layer Stack:** Foreground layers carve luminance masks for lower layers in the stack, allowing complex multi-layer compositions without muddy over-blending.
- **Smooth Preset Crossfading:** Seamless cosine-eased transitions between curated presets with adjustable crossfade duration and automatic VJ preset cycling.
- **Live Audio-Reactive Engine & SomaFM Streaming:**
  - Streams **Synphaera (SomaFM)** by default on launch (`https://ice1.somafm.com/synphaera-128-mp3`), alongside one-click station presets (*Suburbs of Goa*, *DEF CON Radio*, *Space Station Soma*, *Vaporwaves*).
  - Supports external song & stream URLs (SomaFM, Suno, direct MP3/WAV/OGG/AAC streams) as well as built-in procedural Web Audio synthesis.
  - Real-time 3-band FFT frequency analysis (**Bass**, **Mid**, **High**) and live onset-based **BPM detection** that dynamically drives shader animation speed and layer parameters.
- **15s GIF / Video Capture & Live GLSL Export:** Record 15-second animated GIFs or WebM/MP4 video loops directly from the canvas, or inspect and copy the generated standalone GLSL fragment shader at any time.

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
