'use client';

export default function HelpContent() {
    return (
        <div className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-md border border-border bg-card text-card-foreground">
            <h2>Help</h2>
            <p>
                <strong>Geovara</strong> is a quick, simple tool for creating, viewing, and sharing maps. 
                Whether you need to outline a construction site, map a delivery route, or design 
                a retail catchment area, <strong>Geovara</strong> provides professional-grade tools 
                in a browser-based environment.
            </p>
            <p>
                Want to request a feature or report a bug? This is a demo app, but you can imagine an issue tracker link here!
            </p>
            
            <h3>I've got data</h3>
            <p>
                If you have a file (like GeoJSON, KML, or GPX), just <strong>drag and drop it</strong> onto the map. Your data should appear on the map and in the editor!
            </p>
            
            <h3>I want to draw features</h3>
            <p>
                Use the drawing tools on the right side of the map to draw <strong>points, lines, polygons, rectangles, and circles</strong>.
                After you're done drawing, click on a feature to open a popup where you can edit its properties.
            </p>
            <p className="text-xs text-muted-foreground">
                <em>Note:</em> Circles are not natively supported in the GeoJSON standard. GeoDraw creates a circle-shaped polygon with many sides to represent them.
            </p>
            
            <h3>I want to edit features</h3>
            <p>
                To edit feature geometries, click the <strong>pencil icon</strong> to enter editing mode. You can then drag vertices to move them.
                To move an entire feature, hold down the <kbd>Shift</kbd> key while dragging.
            </p>
            <p>
                To delete a feature, select it and then press the <kbd>Delete</kbd> or <kbd>Backspace</kbd> key, or use the delete button in the properties popup.
            </p>
            <p>
                Properties in GeoJSON are stored as 'key-value pairs'. You can edit properties in two ways:
            </p>
            <ol>
                <li>Click the feature on the map and edit properties in the draggable popup.</li>
                <li>Edit the properties directly in the JSON code editor.</li>
            </ol>
            
            <h3>I want to style features</h3>
            <p>
                You can add special properties to a feature to control its style on the map. This is based on the <a href="https://github.com/mapbox/simplestyle-spec" target="_blank" rel="noopener noreferrer">simplestyle-spec</a>.
            </p>
            <p>
                Click on a feature and select 'Add simple style' to see available options. Common properties include:
            </p>
            <ul>
                <li><code>fill</code>: A color for the inside of polygons (e.g., <code>#ff0000</code>, <code>rgba(255,0,0,0.5)</code>).</li>
                <li><code>stroke</code>: A color for lines and polygon borders.</li>
                <li><code>stroke-width</code>: The width of a line or border in pixels.</li>
                <li><code>radius</code>: For point features, the radius of the circle marker.</li>
            </ul>
            
            <h3>URL API</h3>
            <p>
                You can interact with Geovara programmatically via URL parameters.
            </p>
            <h4>#map=zoom/latitude/longitude</h4>
            <p>
                Open the map at a specific location. The argument is numbers separated by <code>/</code>.
            </p>
            <p className="text-xs text-muted-foreground bg-muted p-2 rounded-md font-code break-words">
                Example: <code>/#map=8/51.5/-0.1</code>
            </p>
        </div>
    );
}
