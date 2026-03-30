'use client';

export default function HelpContent() {
    return (
        <div className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-md border border-border bg-card text-card-foreground">
            <h2>Help</h2>
            <p>
                <strong>Geovara</strong> is a professional geospatial analysis toolkit for creating, viewing, 
                analyzing, and sharing geographic data. Whether you need to outline a construction site, 
                map a delivery route, measure distances, or perform buffer analysis, <strong>Geovara</strong> provides 
                engineering-grade tools in a browser-based environment.
            </p>
            
            <h3>Getting Started</h3>
            <p>
                <strong>Import files:</strong> Drag and drop GeoJSON, KML, or TopoJSON files onto the Features tab, 
                or click the upload zone to browse. You can also drop GeoJSON, KML, or TopoJSON directly onto the map viewport. 
                Your data will appear on the map and in the editor.
            </p>
            <p>
                <strong>Search locations:</strong> Use the search bar at the top of the map to find and fly to any location worldwide.
            </p>
            
            <h3>Drawing Features</h3>
            <p>
                Use the drawing tools on the right side of the map to draw <strong>points, lines, polygons, rectangles, and circles</strong>.
                After drawing, click on a feature to open a popup where you can edit its properties.
            </p>
            <p className="text-xs text-muted-foreground">
                <em>Note:</em> Circles are approximated as many-sided polygons for GeoJSON compatibility.
            </p>
            
            <h3>Measurement Tools</h3>
            <p>
                Use the <strong>Measure Distance</strong> (ruler icon) and <strong>Measure Area</strong> (square icon) tools 
                to measure lengths and areas directly on the map. Real-time measurements appear as tooltips while drawing.
            </p>

            <h3>Spatial Analysis</h3>
            <p>
                Access the spatial analysis menu (crosshair icon) in the toolbar for:
            </p>
            <ul>
                <li><strong>Buffer</strong> — Create buffer zones around features</li>
                <li><strong>Centroid</strong> — Calculate geometric centers</li>
                <li><strong>Simplify</strong> — Reduce geometry complexity</li>
                <li><strong>Union</strong> — Merge overlapping polygons</li>
            </ul>
            
            <h3>Editing Features</h3>
            <p>
                Click the <strong>pencil icon</strong> to enter editing mode. Drag vertices to reshape geometry. 
                Hold <kbd>Shift</kbd> while dragging to move an entire feature.
            </p>
            <p>
                To delete a feature, select it and press <kbd>Delete</kbd> or <kbd>Backspace</kbd>.
            </p>
            
            <h3>Exporting Data</h3>
            <p>
                Click the download icon in the toolbar to save your data as:
            </p>
            <ul>
                <li><strong>GeoJSON</strong> — Standard geospatial format</li>
                <li><strong>KML</strong> — Google Earth compatible</li>
                <li><strong>KMZ</strong> — Compressed KML</li>
                <li><strong>TopoJSON</strong> — Topology-preserving format</li>
            </ul>

            <h3>Keyboard Shortcuts</h3>
            <div className="not-prose">
                <table className="w-full text-xs border-collapse">
                    <tbody>
                        <tr className="border-b border-border">
                            <td className="py-1.5 pr-3 font-medium text-muted-foreground">Drawing</td>
                            <td className="py-1.5">
                                <kbd className="kbd">V</kbd> Select · 
                                <kbd className="kbd">P</kbd> Point · 
                                <kbd className="kbd">L</kbd> Line · 
                                <kbd className="kbd">G</kbd> Polygon
                            </td>
                        </tr>
                        <tr className="border-b border-border">
                            <td className="py-1.5 pr-3 font-medium text-muted-foreground">Shapes</td>
                            <td className="py-1.5">
                                <kbd className="kbd">R</kbd> Rectangle · 
                                <kbd className="kbd">C</kbd> Circle · 
                                <kbd className="kbd">E</kbd> Edit
                            </td>
                        </tr>
                        <tr className="border-b border-border">
                            <td className="py-1.5 pr-3 font-medium text-muted-foreground">Measure</td>
                            <td className="py-1.5">
                                <kbd className="kbd">M</kbd> Distance · 
                                <kbd className="kbd">A</kbd> Area
                            </td>
                        </tr>
                        <tr className="border-b border-border">
                            <td className="py-1.5 pr-3 font-medium text-muted-foreground">Edit</td>
                            <td className="py-1.5">
                                <kbd className="kbd">Ctrl+Z</kbd> Undo · 
                                <kbd className="kbd">Ctrl+Y</kbd> Redo
                            </td>
                        </tr>
                        <tr>
                            <td className="py-1.5 pr-3 font-medium text-muted-foreground">General</td>
                            <td className="py-1.5">
                                <kbd className="kbd">Esc</kbd> Deselect · 
                                <kbd className="kbd">Del</kbd> Delete feature
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <h3>Feature Styling</h3>
            <p>
                Add special properties to control appearance (<a href="https://github.com/mapbox/simplestyle-spec" target="_blank" rel="noopener noreferrer">simplestyle-spec</a>):
            </p>
            <ul>
                <li><code>fill</code> — Polygon fill color</li>
                <li><code>stroke</code> — Line/border color</li>
                <li><code>stroke-width</code> — Line width in pixels</li>
                <li><code>radius</code> — Point marker radius</li>
            </ul>
            
            <h3>URL API</h3>
            <h4>#map=zoom/latitude/longitude</h4>
            <p>
                Open the map at a specific location.
            </p>
            <p className="text-xs text-muted-foreground bg-muted p-2 rounded-md font-code break-words">
                Example: <code>/#map=8/51.5/-0.1</code>
            </p>
        </div>
    );
}
