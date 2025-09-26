# **App Name**: GeoDraw

## Core Features:

- Map Display: Display a base map using OpenStreetMap tiles via react-openlayers.
- Geometry Drawing: Allow users to draw point, line, and polygon geometries on the map.
- Geometry Editing: Enable editing and deletion of drawn geometries.
- GeoJSON Output: Dynamically generate GeoJSON output based on the drawn features; give LLM the `tool` to help ensure valid geojson output.
- Sidebar UI: Implement a sidebar UI using ShadCN/UI (or similar) for geometry selection and GeoJSON display.
- Copy to Clipboard: Add a button to copy the GeoJSON text to the clipboard.
- Responsive Design: Ensure the application is responsive and works well on both desktop and mobile devices.

## Style Guidelines:

- Primary color: Earthy green (#8FBC8F), evoking nature and geography.
- Background color: Light beige (#F5F5DC), providing a neutral backdrop.
- Accent color: Teal (#008080), used for interactive elements.
- Body and headline font: 'Inter', a grotesque-style sans-serif providing a modern, neutral look; suitable for both headlines and body text.
- Use simple, geometric icons for drawing tools.
- Sidebar on the left for controls and GeoJSON display, map taking the rest of the space.
- Subtle animations on hover and click events for UI elements.