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
import { Copy, Trash2, CheckCircle, AlertTriangle, Loader2, FileDown, Sparkles } from 'lucide-react';
import { validateGeoJSON } from '@/ai/flows/validate-geojson';
import { Skeleton } from './ui/skeleton';
import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
import JSZip from 'jszip';
import { Feature } from 'ol';
import { Geometry } from 'ol/geom';


const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full" />,
});

interface SidebarProps {
    geojsonString: string;
    onGeojsonChange: (value: string | undefined) => void;
    featuresCount: number;
    onClear: () => void;
}

const geojsonFormat = new GeoJSON({
  featureProjection: 'EPSG:3857',
  dataProjection: 'EPSG:4326',
});

const kmlFormat = new KML({
    extractStyles: true,
    showPointNames: true,
});

export default function Sidebar({ geojsonString, onGeojsonChange, featuresCount, onClear }: SidebarProps) {
  const { toast } = useToast();
  const [validationStatus, setValidationStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
  const [validationFeedback, setValidationFeedback] = useState('');

  const handleCopy = useCallback(() => {
    if (!geojsonString) return;
    navigator.clipboard.writeText(geojsonString);
    toast({
      title: 'Copied to Clipboard!',
      description: 'The GeoJSON has been copied to your clipboard.',
    });
  }, [geojsonString, toast]);
  
  const handleClear = () => {
    onClear();
    setValidationStatus('idle');
    setValidationFeedback('');
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

  const handleDownload = async (format: 'geojson' | 'kml' | 'kmz') => {
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
                data = await zip.generateAsync({type: 'blob'});
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
      <aside className="w-full md:w-[350px] lg:w-[400px] flex-shrink-0 flex flex-col border-r border-border h-full overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h1 className="text-2xl font-bold font-headline">GeoDraw</h1>
          <p className="text-muted-foreground">Draw on the map, get GeoJSON.</p>
        </div>
        <div className="flex flex-col flex-grow p-4 min-h-0">
          <Card className="flex flex-col flex-grow">
            <CardContent className="flex-grow flex flex-col pt-4">
               <TooltipProvider>
                <Menubar className="mb-2 h-auto p-1 justify-between">
                  <div className="flex">
                    <MenubarMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <MenubarTrigger className="w-9 h-9" disabled={featuresCount === 0} onClick={handleClear}>
                            <Trash2 className="h-4 w-4" />
                          </MenubarTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Clear All</p>
                        </TooltipContent>
                      </Tooltip>
                    </MenubarMenu>
                  </div>
                  <div className="flex items-center">
                    <MenubarMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <MenubarTrigger className="w-9 h-9" disabled={!geojsonString} onClick={handleCopy}>
                            <Copy className="h-4 w-4" />
                          </MenubarTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copy GeoJSON</p>
                        </TooltipContent>
                      </Tooltip>
                    </MenubarMenu>
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

                    <MenubarSeparator />
                    
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

              <div className="relative flex-grow w-full rounded-md border border-input overflow-hidden">
                <Editor
                  height="100%"
                  language="json"
                  value={geojsonString}
                  onChange={onGeojsonChange}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>
              {validationStatus !== 'idle' && (
                <div className="mt-2 p-2 rounded-md bg-muted/50 text-muted-foreground text-xs flex items-start gap-2">
                    {validationStatus === 'loading' && <Loader2 className="h-4 w-4 animate-spin mt-0.5 flex-shrink-0" />}
                    {validationStatus === 'valid' && <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />}
                    {validationStatus === 'invalid' && <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0" />}
                    <p className="break-words min-w-0">{validationFeedback}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </aside>
  );
}
