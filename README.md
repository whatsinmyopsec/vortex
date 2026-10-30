# Vortex — Interactive Polar Shader Lab

An interactive WebGL fragment shader playground and real-time audio-reactive visual synthesizer featuring mouse-driven polar tunnel distortion, multi-layer negative-space compositing, smooth preset crossfading, and live GLSL uniform controls.

## 🌐 Live Site

- **GitHub Pages:** [https://whatsinmyopsec.github.io/vortex/](https://whatsinmyopsec.github.io/vortex/)

---

## ✨ Key Features

- **26 Modular GLSL Shader Layers:** Combine and reorder 26 procedural fragment layers including *Polar Harmonic Tunnel*, *Voronoi Cellular Ridge*, *Orbital Starfield Drift*, *FBM Nebula & Aurora Clouds*, *Event Horizon Accretion Disk*, *Truchet Cyber-Conduit Lattice*, *Neon Plasma Wave Caustics*, *Animated Julia Set Fractal*, *Bioluminescent Turing Coral*, *Kaleidoscopic IFS Mandala*, *Iridescent Ferrofluid Oil*, *Hyperbolic 3D Gyroid Labyrinth*, *Op-Art Moiré Interference*, *Quasicrystal Penrose Light Web*, *Chladni Acoustic Cymatics*, *Clifford Strange Attractor*, *4D Hypersphere Hopf Fibration*, *Apollonian Kleinian Fractal*, *Lissajous Laser Oscilloscope*, *Cherenkov Hex-Warp Matrix*, *Morphing Mandelbrot Zoom*, *Recursive Circle Packing*, *Pentagonal Wave Interference*, *Kaleidoscopic IFS Crystal*, *Logarithmic Spiral Vortex*, and *4D Kleinian Inversion Lattice*.
- **Negative-Space Layer Stack:** Foreground layers carve luminance masks for lower layers in the stack, allowing complex multi-layer compositions without muddy over-blending.
- **Smooth Preset Crossfading:** Seamless cosine-eased transitions between curated presets (including *4D Kleinian Mandala Starfield*, *Ferro-Penrose Accretion*, *Event Horizon*, *Sacred Mandala*, *Cymatic Plasma*, and *Bioluminescent Abyss*) with adjustable crossfade duration.
- **Live Audio-Reactive Engine & SomaFM Streaming:**
  - Streams **Synphaera (SomaFM)** by default on launch (`https://ice1.somafm.com/synphaera-128-mp3`), alongside one-click station presets (*Suburbs of Goa*, *Drone Zone*, *DEF CON Radio*, *Space Station Soma*, *Deep Space One*, *Vaporwaves*).
  - Supports external song & stream URLs (SomaFM, Suno, SoundCloud, Bandcamp, direct MP3/WAV/OGG/AAC streams) as well as built-in procedural Web Audio synthesis (*Cyberpunk Bass*, *Acid 303*, *Cosmic Ambient*, *Rhythmic Arp*, *Sub Drone*).
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
