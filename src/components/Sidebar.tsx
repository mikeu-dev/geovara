'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Monaco } from '@monaco-editor/react';
import dynamic from 'next/dynamic';
import { useToast } from '@/hooks/use-toast';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from '@/components/ui/menubar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Copy,
  Trash2,
  Code2,
  AlertTriangle,
  FileDown,
  Check,
  Share2,
  Undo2,
  Redo2,
  ChevronRight,
  ChevronLeft,
  Table2,
  Hexagon,
} from 'lucide-react';
import { CLOUD, footWidth } from '@/lib/cloud-shape';
import {
  validateGeoJSONDeterministic,
  ValidationResult,
} from '@/lib/geojson-validator';
import { GisService } from '@/lib/spatial';
import { FeatureCollection } from 'geojson';
import { Skeleton } from './ui/skeleton';
import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
import JSZip from 'jszip';
import { Feature } from 'ol';
import { Geometry } from 'ol/geom';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AttributeTable from './AttributeTable';
import { geoJsonToCsv } from '@/lib/csv-geojson';
import { geoJsonToWkt } from '@/lib/wkt-geojson';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  onFeaturePropertyChange?: (featureId: string | number, key: string, value: unknown) => void;
  theme?: 'light' | 'dark';
  /** Whether the editor piece is expanded (380px) or collapsed to its 100px rail. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const geojsonFormat = new GeoJSON({
  featureProjection: 'EPSG:3857',
  dataProjection: 'EPSG:4326',
});

const kmlFormat = new KML({
  extractStyles: true,
  showPointNames: true,
});

const TOP = CLOUD.margin + CLOUD.headerH + CLOUD.gap;

/** Monaco themes matching the smoke palette (transparent ground over the code well). */
function defineSmokeThemes(monaco: Monaco) {
  monaco.editor.defineTheme('geovara-smoke', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'string.key.json', foreground: '3E5C8A' },
      { token: 'string.value.json', foreground: 'A44D1E' },
      { token: 'number', foreground: '2E6B4A' },
      { token: 'keyword.json', foreground: '2E6B4A' },
      { token: 'delimiter', foreground: '5B5E65' },
    ],
    colors: {
      'editor.background': '#FFFFFF00',
      'editor.lineHighlightBackground': '#3E5C8A14',
      'editor.lineHighlightBorder': '#00000000',
      'editorLineNumber.foreground': '#5B5E65',
      'editorLineNumber.activeForeground': '#25272B',
      'editor.selectionBackground': '#3E5C8A33',
      'editorGutter.background': '#FFFFFF00',
      'scrollbarSlider.background': '#25272B22',
    },
  });
  monaco.editor.defineTheme('geovara-smoke-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'string.key.json', foreground: '86A2CF' },
      { token: 'string.value.json', foreground: 'E79A6E' },
      { token: 'number', foreground: '7FC39E' },
      { token: 'keyword.json', foreground: '7FC39E' },
    ],
    colors: {
      'editor.background': '#00000000',
      'editorGutter.background': '#00000000',
      'editor.lineHighlightBackground': '#86A2CF1A',
      'editor.lineHighlightBorder': '#00000000',
    },
  });
}

interface MonacoCodeEditor {
  revealLineInCenter: (lineNumber: number) => void;
  setPosition: (position: { lineNumber: number; column: number }) => void;
  focus: () => void;
}

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
  onFeatureSelect,
  onFeaturePropertyChange,
  theme = 'light',
  open,
  onOpenChange,
}: SidebarProps) {
  const { toast } = useToast();
  const editorRef = useRef<MonacoCodeEditor | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [tab, setTab] = useState<'json' | 'table'>('json');

  const width = open ? CLOUD.leftW : CLOUD.tabW;
  const footW = footWidth(width);

  const openTab = useCallback(
    (next: 'json' | 'table') => {
      setTab(next);
      onOpenChange(true);
    },
    [onOpenChange]
  );

  // Automatic real-time GeoJSON validation (0ms, offline RFC 7946)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!geojsonString || !geojsonString.trim()) {
        setValidationResult(null);
      } else {
        const res = validateGeoJSONDeterministic(geojsonString);
        setValidationResult(res);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [geojsonString]);

  const handleJumpToError = (line?: number, column?: number) => {
    if (!editorRef.current || !line) return;
    editorRef.current.revealLineInCenter(line);
    editorRef.current.setPosition({ lineNumber: line, column: column || 1 });
    editorRef.current.focus();
  };

  const handleClear = () => {
    onClear();
    setValidationResult(null);
    setIsClearConfirmOpen(false);
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
    navigator.clipboard.writeText(geojsonString).then(
      () => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast({
          title: 'Copied to clipboard!',
        });
      },
      (err) => {
        console.error('Could not copy text: ', err);
        toast({
          variant: 'destructive',
          title: 'Failed to copy',
          description: 'Could not copy GeoJSON to clipboard.',
        });
      }
    );
  };

  const handleFormatJson = useCallback(() => {
    if (!geojsonString || !geojsonString.trim()) {
      toast({
        variant: 'destructive',
        title: 'Editor Kosong',
        description: 'Tidak ada data GeoJSON untuk dirapikan.',
      });
      return;
    }
    try {
      const parsed = JSON.parse(geojsonString);
      const formatted = JSON.stringify(parsed, null, 2);
      onGeojsonChange(formatted);
      toast({ title: 'JSON diformat dengan rapi' });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Gagal merapikan JSON',
        description: 'Pastikan format JSON valid sebelum dirapikan.',
      });
    }
  }, [geojsonString, onGeojsonChange, toast]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(
      () => {
        setIsLinkCopied(true);
        setTimeout(() => setIsLinkCopied(false), 2000);
        toast({
          title: 'Shareable link copied!',
        });
      },
      (err) => {
        console.error('Could not copy text: ', err);
        toast({
          variant: 'destructive',
          title: 'Failed to copy link',
          description: 'Could not copy link to clipboard.',
        });
      }
    );
  };

  const handleDownload = async (format: 'geojson' | 'topojson' | 'csv' | 'wkt' | 'kml' | 'kmz') => {
    if (!geojsonString) {
      toast({
        variant: 'destructive',
        title: 'Nothing to download',
        description: 'The editor is empty.',
      });
      return;
    }

    try {
      let data: string | Blob;
      let filename = `geovara-map-${Date.now()}`;
      let mimeType = 'text/plain';

      if (format === 'geojson') {
        data = geojsonString;
        filename += '.geojson';
        mimeType = 'application/geo+json';
      } else if (format === 'topojson') {
        const geojsonObj = JSON.parse(geojsonString) as FeatureCollection;
        const topojsonObj = GisService.toTopoJSON(geojsonObj);
        data = JSON.stringify(topojsonObj, null, 2);
        filename += '.topojson';
        mimeType = 'application/json';
      } else if (format === 'csv') {
        data = geoJsonToCsv(geojsonString);
        filename += '.csv';
        mimeType = 'text/csv';
      } else if (format === 'wkt') {
        data = geoJsonToWkt(geojsonString);
        filename += '.wkt';
        mimeType = 'text/plain';
      } else if (format === 'kml') {
        const features = geojsonFormat.readFeatures(JSON.parse(geojsonString));
        data = kmlFormat.writeFeatures(features);
        filename += '.kml';
        mimeType = 'application/vnd.google-earth.kml+xml';
      } else if (format === 'kmz') {
        const features = geojsonFormat.readFeatures(JSON.parse(geojsonString));
        const kmlContent = kmlFormat.writeFeatures(features);
        const zip = new JSZip();
        zip.file('doc.kml', kmlContent);
        data = await zip.generateAsync({ type: 'blob' });
        filename += '.kmz';
        mimeType = 'application/vnd.google-earth.kmz';
      } else {
        return;
      }

      const blob = typeof data === 'string' ? new Blob([data], { type: mimeType }) : data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Selesai',
        description: `Berkas berhasil diunduh sebagai ${filename}`,
      });
    } catch (e) {
      console.error('Download error:', e);
      toast({
        variant: 'destructive',
        title: 'Export Gagal',
        description: 'Terjadi kesalahan saat mengekspor data.',
      });
    }
  };

  const fc = validationResult?.stats?.featureCount ?? features.length;
  const iconBtn =
    'w-9 h-9 p-0 justify-center rounded-cloud-sa text-muted-foreground hover:text-foreground hover:bg-smoke-mid/55 focus:bg-smoke-mid/55 data-[state=open]:bg-smoke-mid/55';

  return (
    <>
      <section
        aria-label="Editor GeoJSON"
        className="cloud-move absolute z-30 overflow-hidden select-none"
        style={{ left: CLOUD.margin, top: TOP, bottom: TOP, width }}
      >
        {/* Expanded editor */}
        <div
          className="cloud-fade absolute inset-y-0 left-0 flex flex-col"
          style={{
            width: CLOUD.leftW,
            opacity: open ? 1 : 0,
            pointerEvents: open ? 'auto' : 'none',
            transform: `translateX(${open ? 0 : -40}px)`,
          }}
          aria-hidden={!open}
        >
          <TooltipProvider>
            <div className="flex items-center justify-between pt-3 pb-2 pl-[22px] pr-[14px]">
              <h2 className="text-[17px] font-black">Editor</h2>
              <Menubar className="border-none p-0 h-auto bg-transparent gap-0.5 shadow-none">
                <MenubarMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <MenubarTrigger
                        className={`${iconBtn} hover:text-destructive`}
                        onClick={() => setIsClearConfirmOpen(true)}
                        disabled={featuresCount === 0 && (!geojsonString || !geojsonString.trim())}
                        aria-label="Hapus semua fitur"
                      >
                        <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.8} />
                      </MenubarTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Hapus Semua Data</p>
                    </TooltipContent>
                  </Tooltip>
                </MenubarMenu>

                <MenubarMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <MenubarTrigger
                        className={iconBtn.replace('rounded-cloud-sa', 'rounded-cloud-sb')}
                        onClick={undo}
                        disabled={!canUndo}
                        aria-label="Undo"
                      >
                        <Undo2 className="h-[18px] w-[18px]" strokeWidth={1.8} />
                      </MenubarTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Undo (Ctrl+Z)</p>
                    </TooltipContent>
                  </Tooltip>
                </MenubarMenu>

                <MenubarMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <MenubarTrigger
                        className={iconBtn}
                        onClick={redo}
                        disabled={!canRedo}
                        aria-label="Redo"
                      >
                        <Redo2 className="h-[18px] w-[18px]" strokeWidth={1.8} />
                      </MenubarTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Redo (Ctrl+Y)</p>
                    </TooltipContent>
                  </Tooltip>
                </MenubarMenu>

                <MenubarMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <MenubarTrigger
                        className={iconBtn.replace('rounded-cloud-sa', 'rounded-cloud-sb')}
                        onClick={handleCopyLink}
                        aria-label="Bagikan tautan peta"
                      >
                        {isLinkCopied ? (
                          <Check className="h-[18px] w-[18px] text-success" strokeWidth={1.8} />
                        ) : (
                          <Share2 className="h-[18px] w-[18px]" strokeWidth={1.8} />
                        )}
                      </MenubarTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{isLinkCopied ? 'Tautan disalin!' : 'Bagikan tautan peta'}</p>
                    </TooltipContent>
                  </Tooltip>
                </MenubarMenu>

                <MenubarMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <MenubarTrigger
                        className={iconBtn}
                        disabled={!geojsonString}
                        aria-label="Ekspor"
                      >
                        <FileDown className="h-[18px] w-[18px]" strokeWidth={1.8} />
                      </MenubarTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Ekspor Dataset</p>
                    </TooltipContent>
                  </Tooltip>
                  <MenubarContent className="rounded-cloud-b">
                    <MenubarItem onClick={() => handleDownload('geojson')}>
                      Save as GeoJSON
                    </MenubarItem>
                    <MenubarItem onClick={() => handleDownload('topojson')}>
                      Save as TopoJSON
                    </MenubarItem>
                    <MenubarItem onClick={() => handleDownload('csv')}>Save as CSV</MenubarItem>
                    <MenubarItem onClick={() => handleDownload('wkt')}>Save as WKT</MenubarItem>
                    <MenubarItem onClick={() => handleDownload('kml')}>Save as KML</MenubarItem>
                    <MenubarItem onClick={() => handleDownload('kmz')}>Save as KMZ</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="w-9 h-9 ml-0.5 flex items-center justify-center rounded-cloud-sa bg-smoke-mid/55 text-foreground hover:bg-smoke-mid transition-colors"
                      aria-label="Ciutkan editor"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Ciutkan editor</p>
                  </TooltipContent>
                </Tooltip>
              </Menubar>
            </div>

            {/* JSON / Table segmented tabs with a sliding thumb */}
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as 'json' | 'table')}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
            >
              <TabsList className="relative grid grid-cols-2 h-auto flex-shrink-0 mt-1 mb-2.5 ml-[22px] mr-[14px] p-1 rounded-cloud-a bg-smoke-mid/55">
                <span
                  aria-hidden="true"
                  className="cloud-move cloud-spring absolute top-1 bottom-1 w-[calc(50%-4px)] bg-smoke-well/90 shadow-[0_3px_8px_rgb(var(--shadow-ink)/0.12)]"
                  style={{
                    left: tab === 'json' ? 4 : '50%',
                    borderRadius: tab === 'json' ? '16px 8px 16px 8px' : '8px 16px 8px 16px',
                  }}
                />
                <TabsTrigger
                  value="json"
                  className="relative h-9 text-sm font-extrabold text-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  JSON
                </TabsTrigger>
                <TabsTrigger
                  value="table"
                  className="relative h-9 text-sm font-extrabold text-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Tabel ({features.length})
                </TabsTrigger>
              </TabsList>

              {/* JSON Monaco Editor Tab */}
              <TabsContent
                value="json"
                className="flex-1 relative mt-0 mb-[18px] ml-[22px] mr-[14px] rounded-cloud-b bg-smoke-well/60 shadow-[inset_0_1px_2px_rgb(var(--shadow-ink)/0.06)] overflow-hidden min-h-0"
              >
                {geojsonString && (
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-cloud-sa bg-smoke-light/80 hover:bg-smoke-mid"
                          onClick={handleFormatJson}
                          disabled={!geojsonString || !geojsonString.trim()}
                          aria-label="Format JSON"
                        >
                          <Code2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Rapikan / Format JSON</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-cloud-sb bg-smoke-light/80 hover:bg-smoke-mid"
                          onClick={handleCopy}
                          aria-label="Salin ke clipboard"
                        >
                          {isCopied ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>{isCopied ? 'Disalin!' : 'Salin ke clipboard'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}

                <Editor
                  height="100%"
                  language="json"
                  value={geojsonString}
                  onChange={onGeojsonChange}
                  onMount={(editor) => {
                    editorRef.current = editor;
                  }}
                  beforeMount={(monaco) => {
                    defineSmokeThemes(monaco);
                    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
                      validate: true,
                      allowComments: false,
                      schemas: [
                        {
                          uri: 'http://json.schemastore.org/geojson.json',
                          fileMatch: ['*'],
                        },
                      ],
                    });
                  }}
                  theme={theme === 'dark' ? 'geovara-smoke-dark' : 'geovara-smoke'}
                  options={{
                    readOnly: false,
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineHeight: 22,
                    fontFamily: "'Red Hat Mono', ui-monospace, monospace",
                    lineNumbers: 'on',
                    lineNumbersMinChars: 3,
                    glyphMargin: false,
                    folding: false,
                    padding: { top: 10 },
                    wordWrap: 'on',
                    tabSize: 2,
                    insertSpaces: true,
                    formatOnPaste: true,
                    formatOnType: true,
                    autoClosingBrackets: 'always',
                    autoClosingQuotes: 'always',
                    autoSurround: 'languageDefined',
                    suggestOnTriggerCharacters: true,
                    acceptSuggestionOnEnter: 'on',
                    tabCompletion: 'on',
                    quickSuggestions: { other: true, comments: false, strings: true },
                    bracketPairColorization: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    renderLineHighlight: 'all',
                    overviewRulerLanes: 0,
                    cursorBlinking: 'smooth',
                  }}
                />

                {validationResult && !validationResult.isValid && (
                  <button
                    type="button"
                    onClick={() =>
                      handleJumpToError(validationResult.line, validationResult.column)
                    }
                    className="absolute bottom-2 left-2 right-2 px-3 py-2.5 rounded-cloud-a bg-destructive text-destructive-foreground text-xs flex items-center justify-between z-10 text-left transition-colors hover:bg-destructive/90 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 overflow-hidden pr-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate font-mono">{validationResult.feedback}</span>
                    </div>
                    {validationResult.line && (
                      <span className="text-[10px] font-mono opacity-90 underline group-hover:opacity-100 flex-shrink-0">
                        Lompat ke baris {validationResult.line} →
                      </span>
                    )}
                  </button>
                )}
              </TabsContent>

              {/* Table Tab */}
              <TabsContent
                value="table"
                className="flex-1 mt-0 mb-[18px] ml-[22px] mr-[14px] rounded-cloud-b bg-smoke-well/60 overflow-hidden min-h-0 data-[state=active]:flex data-[state=active]:flex-col"
              >
                <AttributeTable
                  features={features}
                  onPropertyChange={onFeaturePropertyChange || (() => {})}
                  onZoomToFeature={onZoomToFeature}
                  onFeatureSelect={onFeatureSelect}
                  onDeleteFeature={onDeleteFeature}
                />
              </TabsContent>
            </Tabs>
          </TooltipProvider>
        </div>

        {/* Collapsed rail */}
        <div
          className="cloud-fade absolute left-0 top-0 flex flex-col items-center gap-2 pt-3.5"
          style={{ width: CLOUD.tabW, opacity: open ? 0 : 1, pointerEvents: open ? 'none' : 'auto' }}
          aria-hidden={open}
        >
          <button
            type="button"
            onClick={() => onOpenChange(true)}
            aria-label="Buka editor"
            title="Buka editor"
            className="w-12 h-12 flex items-center justify-center rounded-cloud-sa bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => openTab('json')}
            aria-label="Buka JSON"
            title="Buka JSON"
            className="w-[52px] h-[52px] rounded-cloud-sb bg-smoke-mid/55 text-primary font-mono font-extrabold text-sm hover:bg-smoke-mid transition-colors"
          >
            {'{}'}
          </button>
          <button
            type="button"
            onClick={() => openTab('table')}
            aria-label="Buka tabel"
            title="Buka tabel"
            className="w-[52px] h-[52px] flex items-center justify-center rounded-cloud-sa bg-smoke-mid/55 text-muted-foreground hover:bg-smoke-mid transition-colors"
          >
            <Table2 className="h-5 w-5" strokeWidth={1.7} />
          </button>
        </div>
      </section>

      {/* Validation status in the left piece's foot */}
      <div
        role="status"
        className="cloud-move absolute z-30 flex flex-col justify-center px-[18px] font-mono text-xs font-semibold overflow-hidden whitespace-nowrap"
        style={{
          bottom: CLOUD.margin,
          height: CLOUD.footH,
          left: CLOUD.margin + width - footW,
          width: footW,
        }}
      >
        {!validationResult ? (
          <span className="text-muted-foreground font-medium">{open ? 'Belum ada data' : 'Kosong'}</span>
        ) : validationResult.isValid ? (
          <>
            <span className="flex items-center gap-1.5 text-success">
              <Hexagon className="h-3.5 w-3.5" strokeWidth={1.8} />
              {open ? 'GeoJSON valid · RFC 7946' : 'Valid'}
            </span>
            <span className="text-muted-foreground font-medium">
              {open ? `${fc} fitur · 0 galat` : `${fc} fitur`}
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.8} />
              {open ? 'GeoJSON tidak valid' : 'Galat'}
            </span>
            <span className="text-muted-foreground font-medium">
              {validationResult.line ? `baris ${validationResult.line}` : 'periksa editor'}
            </span>
          </>
        )}
      </div>

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Semua Fitur?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus seluruh data fitur dari peta dan mengosongkan editor.
              Tindakan ini dapat dibatalkan menggunakan Undo (Ctrl+Z).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleClear}
            >
              Hapus Semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
