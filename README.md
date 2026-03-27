# 🌍 Geo-Draw: Professional Geospatial Engineering Platform

**Geo-Draw** is a high-performance, stateless geospatial editing platform designed for professional GIS workflows. Built with Next.js and OpenLayers, it transforms the concept of a simple map editor into an engineering-grade tool with advanced state management and spatial computation capabilities.

---

## 🚀 Engineering-Grade Features

### 🔹 Stateless & URL-Driven Architecure
- **LZW Compression**: Synchronizes entire GeoJSON feature collections directly to the URL hash using LZW algorithms. Share complex map workspaces via a single link with zero backend dependency.
- **Deep Linking**: Preservation of map view (center, zoom) and data state across sessions using a robust URL-sync engine.

### 🔹 High-Performance Rendering & Processing
- **Web Workers**: Off-thread parsing of massive GeoJSON datasets (>5MB) to ensure 60fps UI responsiveness.
- **VectorImageLayer Optimization**: Utilizes rasterization caching for dense geometry datasets, significantly reducing GPU/CPU overhead during pan/zoom interactions.

### 🔹 Advanced Spatial Intelligence
- **GisService (Turf.js)**: Encapsulated service layer for complex geometric operations:
  - **Spatial Analysis**: Real-time Buffer, Centroid calculation, and Intersection detection.
  - **Live Metrics**: Dynamic Area (m²/km²) and Length calculation for every feature.
- **TopoJSON Support**: Ability to export to TopoJSON format for optimized data storage and topological integrity.

### 🔹 Professional GIS Standards
- **Projection Switcher (CRS)**: Seamlessly toggle between **WGS 84 (EPSG:4326)** and **Web Mercator (EPSG:3857)**.
- **Data Integrity**: Runtime validation of GeoJSON structures using **Zod schemas**, preventing application crashes from malformed external data.
- **Undo/Redo Engine**: Professional-grade command-pattern implementation for editing history management.

---

## 🛠️ Technical Stack

- **Core**: Next.js 15+ (App Router), TypeScript
- **Mapping Engine**: OpenLayers (Enterprise standard)
- **Spatial Logic**: Turf.js
- **State/URL**: lz-string
- **UI/Aesthetics**: Tailwind CSS, ShadCN/UI, Lucide Icons
- **Validation**: Zod

---

## 🏁 Getting Started

### Prerequisites
- Node.js 18+
- npm / pnpm / yarn

### Installation

1.  Clone the repository:
    ```sh
    git clone <your-repository-url>
    cd geo-draw
    ```

2.  Install dependencies:
    ```sh
    npm install --legacy-peer-deps
    ```

3.  Run development server:
    ```sh
    npm run dev
    ```

Open [http://localhost:9002](http://localhost:9002) to start exploring.

---

## 📖 Project Documentation
More detailed technical walkthroughs can be found in:
- [Engineering Walkthrough](file:///home/mikeudev/.gemini/antigravity/brain/132a0c2e-0994-4cc9-b3dd-c8aee1aa6b67/walkthrough.md)
- [Architecture Implementation Plan](file:///home/mikeudev/.gemini/antigravity/brain/132a0c2e-0994-4cc9-b3dd-c8aee1aa6b67/implementation_plan.md)

---
*Created by Mikeudev (Senior Geospatial Platform Engineer Simulation)*
