# GeoDraw

GeoDraw is a simple web-based editor for creating and viewing GeoJSON data, inspired by geojson.io. You can draw points, lines, and polygons on an interactive map and get the corresponding GeoJSON output in real-time.

This project is built with Next.js, OpenLayers, and Tailwind CSS with ShadCN/UI.

## Features

- **Interactive Map**: Pan and zoom on a base map from OpenStreetMap.
- **Drawing Tools**: Create Point, LineString, and Polygon geometries.
- **Editing**: Modify and delete drawn features.
- **Real-time GeoJSON**: See the GeoJSON output update as you draw.
- **AI Validation**: Validate your GeoJSON structure using an AI-powered tool.
- **Copy to Clipboard**: Easily copy the generated GeoJSON.
- **Responsive Design**: Works on both desktop and mobile devices.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing.

### Prerequisites

You need to have Node.js and npm (or yarn/pnpm) installed on your machine.

### Installation

1.  Clone the repository:
    ```sh
    git clone <your-repository-url>
    cd <repository-directory>
    ```

2.  Install the dependencies:
    ```sh
    npm install
    ```

### Running the Development Server

Once the dependencies are installed, you can run the development server:

```sh
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

The application will automatically reload if you change any of the source files.
