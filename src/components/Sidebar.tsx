'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Copy, Trash2, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { validateGeoJSON } from '@/ai/flows/validate-geojson';
import { Skeleton } from './ui/skeleton';

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
  
  return (
      <aside className="w-full md:w-[350px] lg:w-[400px] flex-shrink-0 flex flex-col border-r border-border h-full overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h1 className="text-2xl font-bold font-headline">GeoDraw</h1>
          <p className="text-muted-foreground">Draw on the map, get GeoJSON.</p>
        </div>
        <Separator className="my-0" />
        <div className="flex flex-col flex-grow p-4 min-h-0">
          <Card className="flex flex-col flex-grow">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">GeoJSON Output</CardTitle>
                    <div className="flex items-center gap-2">
                       <Button variant="outline" size="sm" onClick={handleClear} disabled={featuresCount === 0}>
                        <Trash2 className="h-4 w-4 mr-2" /> Clear All
                      </Button>
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
