'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import { Copy, MapPin, Spline, Square, Trash2, CheckCircle, AlertTriangle, Loader2, Circle, Wand2 } from 'lucide-react';
import { validateGeoJSON } from '@/ai/flows/validate-geojson';
import { generateFeatureDescription } from '@/ai/flows/generate-feature-description';
import type { DrawType } from '@/app/page';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { Skeleton } from './ui/skeleton';
import { Textarea } from './ui/textarea';

const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full" />,
});

interface SidebarProps {
    drawType: DrawType | null;
    setDrawType: (type: DrawType | null) => void;
    geojsonString: string;
    onGeojsonChange: (value: string | undefined) => void;
    featuresCount: number;
    onClear: () => void;
    selectedFeature: Feature<Geometry> | null;
    onDeleteSelected: () => void;
    onFeaturePropertyChange: (key: string, value: any) => void;
}

export default function Sidebar({ drawType, setDrawType, geojsonString, onGeojsonChange, featuresCount, onClear, selectedFeature, onDeleteSelected, onFeaturePropertyChange }: SidebarProps) {
  const { toast } = useToast();
  const [validationStatus, setValidationStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
  const [validationFeedback, setValidationFeedback] = useState('');
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

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

  const handleGenerateDescription = async () => {
    if (!selectedFeature) return;
    setIsGeneratingDesc(true);
    try {
      const featureObject = {
        type: 'Feature',
        geometry: selectedFeature.getGeometry()?.getType(),
        properties: selectedFeature.getProperties(),
      };
      const result = await generateFeatureDescription({ feature: JSON.stringify(featureObject) });
      onFeaturePropertyChange('description', result.description);
      toast({
        title: 'Description Generated',
        description: 'AI has generated a new description for the feature.',
      });
    } catch (error) {
      console.error('Description generation error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate a description.',
      });
    } finally {
      setIsGeneratingDesc(false);
    }
  };
  
  const handleDrawTypeChange = (value: DrawType) => {
    setDrawType(drawType === value ? null : value);
  };

  useEffect(() => {
    if (geojsonString) {
      setValidationStatus('idle');
    }
  }, [geojsonString]);
  
  return (
      <aside className="w-full md:w-[350px] lg:w-[400px] flex-shrink-0 flex flex-col border-r border-border h-full overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h1 className="text-2xl font-bold font-headline">GeoDraw</h1>
          <p className="text-muted-foreground">Draw on the map, get GeoJSON.</p>
        </div>
        <div className="p-4 space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Drawing Tools</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <ToggleGroup 
                type="single" 
                value={drawType ?? ''} 
                onValueChange={(value: DrawType) => handleDrawTypeChange(value)}
                className="w-full grid grid-cols-4"
              >
                <ToggleGroupItem value="Point" aria-label="Draw a point" className="flex-1 gap-2">
                  <MapPin className="h-4 w-4" /> <span className="hidden sm:inline">Point</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="LineString" aria-label="Draw a line" className="flex-1 gap-2">
                  <Spline className="h-4 w-4" /> <span className="hidden sm:inline">Line</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="Polygon" aria-label="Draw a polygon" className="flex-1 gap-2">
                  <Square className="h-4 w-4" /> <span className="hidden sm:inline">Polygon</span>
                </ToggleGroupItem>
                 <ToggleGroupItem value="Circle" aria-label="Draw a circle" className="flex-1 gap-2">
                  <Circle className="h-4 w-4" /> <span className="hidden sm:inline">Circle</span>
                </ToggleGroupItem>
              </ToggleGroup>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={handleClear} disabled={featuresCount === 0}>
                  <Trash2 className="h-4 w-4 mr-2" /> Clear All
                </Button>
                <Button variant="destructive" onClick={onDeleteSelected} disabled={!selectedFeature}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Selected
                </Button>
              </div>
            </CardContent>
          </Card>
          {selectedFeature && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Feature Properties</CardTitle>
                <CardDescription>Edit the properties of the selected feature.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="feature-name">Name</Label>
                  <Input 
                    id="feature-name" 
                    value={selectedFeature.get('name') || ''}
                    onChange={(e) => onFeaturePropertyChange('name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feature-description">Description</Label>
                  <Textarea 
                    id="feature-description" 
                    value={selectedFeature.get('description') || ''}
                    onChange={(e) => onFeaturePropertyChange('description', e.target.value)}
                    className="h-24"
                  />
                  <Button size="sm" variant="outline" className="w-full" onClick={handleGenerateDescription} disabled={isGeneratingDesc}>
                    {isGeneratingDesc ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                     Generate with AI
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        <Separator className="my-0" />
        <div className="flex flex-col flex-grow p-4 min-h-0">
          <Card className="flex flex-col flex-grow">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">GeoJSON Output</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={handleValidate} disabled={!geojsonString}>
                        {validationStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Validate'}
                      </Button>
                      <Button variant="secondary" size="icon" onClick={handleCopy} disabled={!geojsonString}>
                          <Copy className="h-4 w-4" />
                          <span className="sr-only">Copy GeoJSON</span>
                      </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
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
