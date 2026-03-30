'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useToast } from '@/hooks/use-toast';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { Card, CardContent } from '@/components/ui/card';
import { 
  Copy, Trash2, CheckCircle, AlertTriangle, Loader2, 
  FileDown, Sparkles, Sun, Moon, Check, Link2, 
  Map as MapIcon, Crosshair, Share2, Undo2, Redo2 
} from 'lucide-react';
import { validateGeoJSON } from '@/ai/flows/validate-geojson';
import { GisService } from '@/lib/spatial';
import { Feature as GeoJSONFeature, FeatureCollection } from 'geojson';
import { Skeleton } from './ui/skeleton';
import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
import JSZip from 'jszip';
import { Feature } from 'ol';
import { Geometry } from 'ol/geom';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HelpContent from './HelpContent';
import FileDropZone from './FileDropZone';
import { getArea, getLength } from 'ol/sphere';
import { LineString, Polygon, MultiPolygon } from 'ol/geom';


const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full" />,
});

interface SidebarProps {
  geojsonString: string;
  onGeojsonChange: (value: string | undefined) => void;
  featuresCount: number;
  onClear: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  features: Feature<Geometry>[];
  onDeleteFeature: (id: string | number | undefined) => void;
  onZoomToFeature: (id: string | number) => void;
  onFeatureSelect: (feature: Feature<Geometry> | null) => void;
}

const geojsonFormat = new GeoJSON({
  featureProjection: 'EPSG:3857',
  dataProjection: 'EPSG:4326',
});

const kmlFormat = new KML({
  extractStyles: true,
  showPointNames: true,
});
export default function Sidebar({ 
  geojsonString, 
  onGeojsonChange, 
  featuresCount, 
  onClear,
  undo,
  redo,
  canUndo,
  canRedo,
  features,
  onDeleteFeature,
  onZoomToFeature,
  onFeatureSelect
}: SidebarProps) {
  const { toast } = useToast();
  const [validationStatus, setValidationStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
  const [validationFeedback, setValidationFeedback] = useState('');
  const [theme, setTheme] = useState('light');
  const [isCopied, setIsCopied] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleClear = () => {
    onClear();
    setValidationStatus('idle');
    setValidationFeedback('');
  };

  const handleCopy = () => {
    if (!geojsonString) {
      toast({
        variant: 'destructive',
        title: 'Nothing to copy',
        description: 'The editor is empty.',
      });
      return;
    }
    navigator.clipboard.writeText(geojsonString).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast({
        title: 'Copied to clipboard!',
      });
    }, (err) => {
      console.error('Could not copy text: ', err);
      toast({
        variant: 'destructive',
        title: 'Failed to copy',
        description: 'Could not copy GeoJSON to clipboard.',
      });
    });
  };

  const handleBuffer = () => {
    if (!geojsonString) return;
    const radius = prompt('Enter buffer radius in kilometers:', '1');
    if (radius === null) return;
    
    const r = parseFloat(radius);
    if (isNaN(r)) {
      toast({ title: 'Invalid radius', variant: 'destructive' });
      return;
    }

    try {
      const geojson = JSON.parse(geojsonString) as FeatureCollection;
      const bufferedFeatures: GeoJSONFeature[] = [];
      
      geojson.features.forEach(feature => {
        const buffered = GisService.createBuffer(feature as any, r);
        buffered.properties = { 
          ...feature.properties, 
          type: 'buffer', 
          parent_id: feature.id || 'unknown',
          buffer_radius: r 
        };
        bufferedFeatures.push(buffered as any);
      });

      const newGeojson = {
        ...geojson,
        features: [...geojson.features, ...bufferedFeatures]
      };
      
      onGeojsonChange(JSON.stringify(newGeojson, null, 2));
      toast({ title: `Created ${bufferedFeatures.length} buffer(s)` });
    } catch (error) {
       console.error('Buffer error:', error);
       toast({ title: 'Analysis failed', variant: 'destructive' });
    }
  };

  const handleCentroid = () => {
    if (!geojsonString) return;
    try {
      const geojson = JSON.parse(geojsonString) as FeatureCollection;
      const centroid = GisService.calculateCentroid(geojson);
      centroid.properties = { type: 'centroid', generated_at: new Date().toISOString() };
      
      const newGeojson = {
        ...geojson,
        features: [...geojson.features, centroid as any]
      };
      
      onGeojsonChange(JSON.stringify(newGeojson, null, 2));
      toast({ title: 'Centroid calculated' });
    } catch (error) {
       console.error('Centroid error:', error);
       toast({ title: 'Analysis failed', variant: 'destructive' });
    }
  };

  const handleSimplify = () => {
    if (!geojsonString) return;
    const tolerance = prompt('Enter simplification tolerance (e.g. 0.01):', '0.01');
    if (tolerance === null) return;
    
    const t = parseFloat(tolerance);
    if (isNaN(t)) {
      toast({ title: 'Invalid tolerance', variant: 'destructive' });
      return;
    }

    try {
      const geojson = JSON.parse(geojsonString) as FeatureCollection;
      const simplifiedFeatures = geojson.features.map(f => {
        const simplified = GisService.simplifyGeometry(f as any, t);
        return { ...simplified, properties: { ...f.properties, simplified: true, tolerance: t } };
      });

      const newGeojson = { ...geojson, features: simplifiedFeatures };
      onGeojsonChange(JSON.stringify(newGeojson, null, 2));
      toast({ title: 'Geometry simplified' });
    } catch (e) {
      toast({ title: 'Simplification failed', variant: 'destructive' });
    }
  };

  const handleUnion = () => {
    if (!geojsonString) return;
    try {
      const geojson = JSON.parse(geojsonString) as FeatureCollection;
      const polygons = geojson.features.filter(f => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon');
      
      if (polygons.length < 2) {
        toast({ title: 'Need at least 2 polygons to union', variant: 'destructive' });
        return;
      }

      const unioned = GisService.unionFeatures(polygons as any);
      if (unioned) {
        unioned.properties = { type: 'union_result', generated_at: new Date().toISOString() };
        // Remove old polygons and add the new one
        const otherFeatures = geojson.features.filter(f => f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon');
        const newGeojson = { ...geojson, features: [...otherFeatures, unioned as any] };
        onGeojsonChange(JSON.stringify(newGeojson, null, 2));
        toast({ title: 'Polygons unioned successfully' });
      }
    } catch (e) {
      toast({ title: 'Union failed', variant: 'destructive' });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2000);
      toast({
        title: 'Shareable link copied!',
        description: 'Anyone with this link can view your map.',
      });
    }, (err) => {
      console.error('Could not copy link: ', err);
      toast({
        variant: 'destructive',
        title: 'Failed to copy link',
      });
    });
  };

  const handleValidate = async () => {
    if (!geojsonString) {
      toast({
        variant: 'destructive',
        title: 'Empty GeoJSON',
        description: 'There is nothing to validate.',
      });
      return;
    }
    setValidationStatus('loading');
    setValidationFeedback('Validating with AI...');
    try {
      const result = await validateGeoJSON(geojsonString);
      setValidationStatus(result.isValid ? 'valid' : 'invalid');
      setValidationFeedback(result.feedback);
      toast({
        title: result.isValid ? 'Validation Successful' : 'Validation Failed',
        description: result.feedback,
        variant: result.isValid ? 'default' : 'destructive',
        duration: 9000
      });
    } catch (error) {
      console.error('Validation error:', error);
      setValidationStatus('invalid');
      setValidationFeedback('An unexpected error occurred during validation.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to communicate with the validation service.',
      });
    }
  };

  useEffect(() => {
    if (geojsonString) {
      setValidationStatus('idle');
    }
  }, [geojsonString]);

  const handleDownload = async (format: 'geojson' | 'kml' | 'kmz' | 'topojson') => {
    if (format === 'topojson') {
      if (!geojsonString) return;
      try {
        const geojson = JSON.parse(geojsonString) as FeatureCollection;
        const topo = GisService.toTopoJSON(geojson);
        const blob = new Blob([JSON.stringify(topo)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'map.topojson';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: 'Successfully downloaded TopoJSON' });
      } catch (e) {
        toast({ title: 'Failed to generate TopoJSON', variant: 'destructive' });
      }
      return;
    }

    if (!geojsonString) {
      toast({ title: 'No data to save', variant: 'destructive' });
      return;
    }

    try {
      const features = geojsonFormat.readFeatures(geojsonString) as Feature<Geometry>[];
      let data: string | Blob;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case 'geojson':
          data = geojsonString;
          filename = 'map.geojson';
          mimeType = 'application/vnd.geo+json';
          break;
        case 'kml':
          data = kmlFormat.writeFeatures(features);
          filename = 'map.kml';
          mimeType = 'application/vnd.google-earth.kml+xml';
          break;
        case 'kmz':
          const kmlData = kmlFormat.writeFeatures(features, {
            featureProjection: 'EPSG:4326',
            dataProjection: 'EPSG:4326',
          });
          const zip = new JSZip();
          zip.file('doc.kml', kmlData);
          data = await zip.generateAsync({ type: 'blob' });
          filename = 'map.kmz';
          mimeType = 'application/vnd.google-earth.kmz';
          break;
      }

      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: `Successfully downloaded ${filename}` });
    } catch (error) {
      console.error('Error during download:', error);
      toast({ title: 'Download failed', description: 'Could not generate file.', variant: 'destructive' });
    }
  };

  return (
    <aside className="w-full md:w-[350px] lg:w-[400px] flex-shrink-0 flex flex-col border-r border-border h-full overflow-y-auto sidebar-panel">
      <div className="p-4 border-b border-border animate-slide-in-left">
        <h1 className="text-2xl font-bold tracking-tight" style={{background: 'linear-gradient(135deg, hsl(173, 58%, 39%), hsl(210, 70%, 50%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Geovara</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Professional geospatial analysis toolkit</p>
      </div>
      <div className="flex flex-col flex-grow p-4 min-h-0">
        <Card className="flex flex-col flex-grow">
          <CardContent className="flex-grow flex flex-col pt-4">
            <TooltipProvider>
              <Menubar className="mb-2 h-auto p-1 justify-between">
                <div className="flex items-center">
                  <MenubarMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <MenubarTrigger className="w-9 h-9" onClick={handleThemeToggle}>
                          {theme === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </MenubarTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Toggle Theme</p>
                      </TooltipContent>
                    </Tooltip>
                  </MenubarMenu>

                  <MenubarMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <MenubarTrigger className="w-9 h-9" disabled={!canUndo} onClick={undo}>
                          <Undo2 className="h-4 w-4" />
                        </MenubarTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Undo</p>
                      </TooltipContent>
                    </Tooltip>
                  </MenubarMenu>

                  <MenubarMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <MenubarTrigger className="w-9 h-9" disabled={!canRedo} onClick={redo}>
                          <Redo2 className="h-4 w-4" />
                        </MenubarTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Redo</p>
                      </TooltipContent>
                    </Tooltip>
                  </MenubarMenu>

                  <MenubarSeparator className="h-6 mx-1" />

                  <MenubarMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <MenubarTrigger className="w-9 h-9" disabled={!geojsonString} onClick={handleValidate}>
                          {validationStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        </MenubarTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Validate GeoJSON</p>
                      </TooltipContent>
                    </Tooltip>
                  </MenubarMenu>

                  <MenubarMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <MenubarTrigger className="w-9 h-9" onClick={handleCopyLink}>
                          {isLinkCopied ? <Check className="h-4 w-4 text-green-600" /> : <Share2 className="h-4 w-4" />}
                        </MenubarTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isLinkCopied ? 'Link Copied!' : 'Share Map Link'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </MenubarMenu>
                  <MenubarMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <MenubarTrigger className="w-9 h-9" disabled={!geojsonString}>
                          <Crosshair className="h-4 w-4" />
                        </MenubarTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Spatial Analysis</p>
                      </TooltipContent>
                    </Tooltip>
                    <MenubarContent>
                      <MenubarItem onClick={handleBuffer} className="flex items-center gap-2">
                         <div className="w-4 h-4 rounded-full border-2 border-primary" />
                         Buffer Features
                      </MenubarItem>
                      <MenubarItem onClick={handleCentroid} className="flex items-center gap-2">
                         <MapIcon className="w-4 h-4" />
                         Calculate Centroid
                      </MenubarItem>
                      <MenubarSeparator />
                      <MenubarItem onClick={handleSimplify} className="flex items-center gap-2">
                         <Sparkles className="w-4 h-4" />
                         Simplify Geometry
                      </MenubarItem>
                      <MenubarItem onClick={handleUnion} className="flex items-center gap-2">
                         <Copy className="w-4 h-4" />
                         Union All Polygons
                      </MenubarItem>
                    </MenubarContent>
                  </MenubarMenu>

                  <MenubarMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <MenubarTrigger className="w-9 h-9" disabled={!geojsonString}>
                          <FileDown className="h-4 w-4" />
                        </MenubarTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Save File</p>
                      </TooltipContent>
                    </Tooltip>
                    <MenubarContent>
                      <MenubarItem onClick={() => handleDownload('geojson')}>
                        Save as GeoJSON
                      </MenubarItem>
                      <MenubarItem onClick={() => handleDownload('topojson')}>
                        Save as TopoJSON
                      </MenubarItem>
                      <MenubarItem onClick={() => handleDownload('kml')}>
                        Save as KML
                      </MenubarItem>
                      <MenubarItem onClick={() => handleDownload('kmz')}>
                        Save as KMZ
                      </MenubarItem>
                    </MenubarContent>
                  </MenubarMenu>
                </div>
              </Menubar>
            </TooltipProvider>

            <Tabs defaultValue="json" className="flex-grow flex flex-col">
              <TabsList className="w-full">
                <TabsTrigger value="json" className="flex-1">JSON</TabsTrigger>
                <TabsTrigger value="features" className="flex-1">Features ({features.length})</TabsTrigger>
                <TabsTrigger value="help" className="flex-1">Help</TabsTrigger>
              </TabsList>
              <TabsContent value="json" className="flex-grow relative mt-2 rounded-md border border-input overflow-hidden">
                {geojsonString && (
                  <TooltipProvider>
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={handleClear}
                            disabled={featuresCount === 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Clear</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={handleCopy}
                          >
                            {isCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isCopied ? 'Copied!' : 'Copy to clipboard'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                )}
                <Editor
                  height="100%"
                  language="json"
                  value={geojsonString}
                  onChange={onGeojsonChange}
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
                {validationStatus !== 'idle' && (
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-muted/80 backdrop-blur-sm text-muted-foreground text-xs flex items-start gap-2 border-t">
                    {validationStatus === 'loading' && <Loader2 className="h-4 w-4 animate-spin mt-0.5 flex-shrink-0" />}
                    {validationStatus === 'valid' && <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />}
                    {validationStatus === 'invalid' && <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0" />}
                    <p className="break-words min-w-0">{validationFeedback}</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="features" className="flex-grow mt-2 overflow-y-auto">
                <div className="space-y-2">
                  <FileDropZone onFileLoad={(content, filename) => {
                    try {
                      let geojsonStr = content;
                      if (filename.endsWith('.kml')) {
                        const kmlFeatures = kmlFormat.readFeatures(content, { featureProjection: 'EPSG:3857' });
                        const gjFormat = new GeoJSON({ featureProjection: 'EPSG:3857', dataProjection: 'EPSG:4326' });
                        geojsonStr = gjFormat.writeFeatures(kmlFeatures as any);
                      }
                      onGeojsonChange(geojsonStr);
                      toast({ title: `Imported ${filename}` });
                    } catch (err) {
                      toast({ title: 'Import failed', description: 'Could not parse the file.', variant: 'destructive' });
                    }
                  }} />
                  {features.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground italic text-sm">
                      No features drawn yet.
                    </div>
                  ) : (
                    features.map((feature, idx) => {
                      const geom = feature.getGeometry();
                      const geomType = geom?.getType();
                      let stat = '';
                      if (geom && (geomType === 'Polygon' || geomType === 'MultiPolygon')) {
                        const area = getArea(geom);
                        stat = area > 1e6 ? `${(area / 1e6).toFixed(2)} km²` : `${area.toFixed(0)} m²`;
                      } else if (geom && (geomType === 'LineString' || geomType === 'MultiLineString')) {
                        const len = getLength(geom);
                        stat = len > 1000 ? `${(len / 1000).toFixed(2)} km` : `${len.toFixed(0)} m`;
                      }
                      return (
                        <Card key={feature.getId() || idx} className="p-2.5 mb-1.5 hover:bg-accent/50 transition-all duration-150 cursor-pointer border-border/60" onClick={() => onFeatureSelect(feature)}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                geomType?.includes('Polygon') ? 'bg-accent' :
                                geomType?.includes('Line') ? 'bg-blue-500' : 'bg-orange-500'
                              }`} />
                              <div className="flex flex-col">
                                <span className="text-xs font-medium truncate w-28">{String(feature.getId() || `Feature ${idx}`)}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-muted-foreground uppercase">{geomType}</span>
                                  {stat && <span className="text-[10px] text-accent font-medium">· {stat}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onZoomToFeature(feature.getId()!); }}>
                                    <Crosshair className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Zoom to</p></TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDeleteFeature(feature.getId()); }}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Delete</p></TooltipContent>
                              </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              </TabsContent>
              <TabsContent value="help" className="flex-grow mt-2 overflow-y-auto">
                <HelpContent />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
