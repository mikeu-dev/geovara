'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Layers,
  Eye,
  EyeOff,
  Map as MapIcon,
  Crosshair,
  Trash2,
  ChevronRight,
  Grid,
  Pentagon,
  Spline,
  MapPin,
  Shapes,
} from 'lucide-react';
import { CLOUD, CLOUD_MOBILE, type DesktopLayout } from '@/lib/cloud-shape';
import { SHEET_TABS_H } from './MobileSheet';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import FileDropZone from './FileDropZone';
import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
import { Feature } from 'ol';
import { Geometry } from 'ol/geom';
import { measureFeature } from '@/lib/measure';
import { GisService } from '@/lib/spatial';
import { parseGeoJsonStringInWorker, shouldParseGeoJsonInWorker } from '@/lib/geojson-worker-parse';
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

const kmlFormat = new KML({
  extractStyles: true,
  showPointNames: true,
});

interface RightSidebarProps {
  features: Feature<Geometry>[];
  onGeojsonChange: (geojsonStr: string) => void;
  onDeleteFeature: (featureId: string | number) => void;
  onZoomToFeature: (featureId: string | number) => void;
  onFeatureSelect: (feature: Feature<Geometry> | null) => void;
  onHeavyParseChange?: (isParsing: boolean) => void;
  vectorOpacity: number;
  onVectorOpacityChange: (opacity: number) => void;
  vectorVisible: boolean;
  onVectorVisibleChange: (visible: boolean) => void;
  basemapOpacity: number;
  onBasemapOpacityChange: (opacity: number) => void;
  showGraticule?: boolean;
  onToggleGraticule?: () => void;
  selectedFeature?: Feature<Geometry> | null;
  /** Whether the manager piece is expanded (350px) or collapsed to its 100px rail. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Desktop shell geometry for the current state. */
  layout: DesktopLayout;
  /** On mobile the feature list renders inside the bottom sheet's "Fitur" tab. */
  sheet?: { active: boolean; top: number } | null;
}

const TOP = CLOUD.margin + CLOUD.headerH + CLOUD.gap;
const CA = '24px 12px 24px 12px';
const CB = '12px 24px 12px 24px';
const CAS = '16px 8px 16px 8px';
const CBS = '8px 16px 8px 16px';

function GeomIcon({ type, className }: { type?: string; className?: string }) {
  const props = { className, strokeWidth: 1.9 };
  if (type?.includes('Polygon')) return <Pentagon {...props} />;
  if (type?.includes('Line')) return <Spline {...props} />;
  if (type?.includes('Point')) return <MapPin {...props} />;
  return <Shapes {...props} />;
}

const GEOM_LABEL: Record<string, string> = {
  Point: 'Titik',
  MultiPoint: 'Multi-titik',
  LineString: 'Garis',
  MultiLineString: 'Multi-garis',
  Polygon: 'Poligon',
  MultiPolygon: 'Multi-poligon',
  Circle: 'Lingkaran',
  GeometryCollection: 'Koleksi geometri',
};
const geomLabel = (t?: string) => (t ? (GEOM_LABEL[t] ?? t) : '');

/** Generated ids look like `Rectangle_1715…` or `buffer_1715…`; name them by what made them. */
const ID_PREFIX_LABEL: [RegExp, string][] = [
  [/^rectangle/i, 'Persegi'],
  [/^circle/i, 'Lingkaran'],
  [/^buffer/i, 'Buffer'],
  [/^union/i, 'Gabungan'],
  [/^centroid/i, 'Titik tengah'],
  [/^convex_hull/i, 'Hull'],
  [/^bbox/i, 'Kotak batas'],
];

function featureLabel(id: string | number | undefined, geomType: string | undefined, idx: number) {
  const n = idx + 1;
  const sid = id === undefined ? '' : String(id);
  const hit = ID_PREFIX_LABEL.find(([re]) => re.test(sid));
  if (hit) return `${hit[1]} ${n}`;
  if (sid && !/_\d{6,}/.test(sid) && !/^f(eature)?_/.test(sid) && !/^dev_f_/.test(sid)) return sid;
  return `${geomLabel(geomType) || 'Fitur'} ${n}`;
}

function featureSummary(feature: Feature<Geometry>, idx: number) {
  const geomType = feature.getGeometry()?.getType();
  const stat = measureFeature(feature)?.label ?? '';
  const props = Object.entries(feature.getProperties()).filter(
    ([k, v]) => k !== 'geometry' && v !== null && v !== undefined && typeof v !== 'object'
  );
  const nameEntry = props.find(([k]) =>
    ['name', 'nama', 'title', 'label'].includes(k.toLowerCase())
  );
  const name = nameEntry ? String(nameEntry[1]) : featureLabel(feature.getId(), geomType, idx);
  const firstOther = props.find(([k]) => k !== nameEntry?.[0]);
  const sub = [geomLabel(geomType), firstOther ? String(firstOther[1]) : null].filter(Boolean).join(' · ');
  const attrs = props.filter(([k]) => k !== nameEntry?.[0]).slice(0, 3);
  return { geomType, stat, name, sub, attrs };
}

const openSpatialTools = () => window.dispatchEvent(new CustomEvent('geovara:spatial-tools'));

export default function RightSidebar({
  features,
  onGeojsonChange,
  onDeleteFeature,
  onZoomToFeature,
  onFeatureSelect,
  onHeavyParseChange,
  vectorOpacity,
  onVectorOpacityChange,
  vectorVisible,
  onVectorVisibleChange,
  basemapOpacity,
  onBasemapOpacityChange,
  showGraticule = false,
  onToggleGraticule,
  selectedFeature = null,
  open,
  onOpenChange,
  layout,
  sheet = null,
}: RightSidebarProps) {
  const { toast } = useToast();
  const [featureToDelete, setFeatureToDelete] = useState<string | number | null>(null);
  const [tab, setTab] = useState<'features' | 'layers'>('features');
  const width = layout.rw;
  const footW = layout.rightFootW;
  const selectedId = selectedFeature?.getId();

  const handleConfirmDeleteFeature = (id: string | number | null) => {
    if (id !== null && id !== undefined) {
      onDeleteFeature(id);
      setFeatureToDelete(null);
    }
  };

  const deleteDialog = (
    <>
      {/* Delete Single Feature Confirmation Dialog */}
      <AlertDialog
        open={featureToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setFeatureToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Fitur?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus fitur <code>{String(featureToDelete ?? '')}</code> dari
              peta dan editor secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleConfirmDeleteFeature(featureToDelete)}
            >
              Hapus Fitur
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  const featuresBody = (
    <div className="flex flex-col gap-2 pb-1">
      <FileDropZone
        onFileLoad={async (content, filename) => {
          const lower = filename.toLowerCase();
          const isTopo = lower.endsWith('.topojson');
          const isKml = lower.endsWith('.kml');
          const canTryWorker = !isKml && !isTopo && shouldParseGeoJsonInWorker(content.length);

          onHeavyParseChange?.(true);
          await new Promise<void>((r) => requestAnimationFrame(() => r()));

          try {
            let geojsonStr = content;
            if (isKml) {
              const kmlFeatures = kmlFormat.readFeatures(content, {
                featureProjection: 'EPSG:3857',
              });
              const gjFormat = new GeoJSON({
                featureProjection: 'EPSG:3857',
                dataProjection: 'EPSG:4326',
              });
              geojsonStr = gjFormat.writeFeatures(kmlFeatures as Feature<Geometry>[]);
            } else if (isTopo) {
              const topology = JSON.parse(content);
              const fc = GisService.fromTopoJSON(topology);
              geojsonStr = JSON.stringify(fc, null, 2);
            } else if (canTryWorker) {
              const parsed = await parseGeoJsonStringInWorker(content);
              geojsonStr = JSON.stringify(parsed, null, 2);
            } else {
              try {
                const parsed = JSON.parse(content);
                geojsonStr = JSON.stringify(parsed, null, 2);
              } catch {
                geojsonStr = content;
              }
            }
            onGeojsonChange(geojsonStr);
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('map:fitbounds'));
            }, 60);
            toast({ title: `${filename} diimpor` });
          } catch {
            toast({
              title: 'Impor gagal',
              description: 'Berkas tidak dapat dibaca.',
              variant: 'destructive',
            });
          } finally {
            onHeavyParseChange?.(false);
          }
        }}
      />

      {features.length === 0 ? (
        <p className="text-center py-6 text-muted-foreground text-sm">
          Belum ada fitur digambar atau diimpor.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {features.map((feature, idx) => {
            const { geomType, stat, name, sub, attrs } = featureSummary(feature, idx);
            const id = feature.getId();
            const on = id !== undefined && id === selectedId;
            return (
              <li
                key={id ?? idx}
                className="cloud-move cloud-spring overflow-hidden"
                style={{
                  borderRadius: idx % 2 ? CB : CA,
                  background: on ? 'rgb(var(--well) / 0.88)' : 'rgb(var(--well) / 0.5)',
                  boxShadow: on
                    ? '0 6px 16px rgb(var(--shadow-ink) / 0.14), inset 0 0 0 1.5px hsl(var(--primary))'
                    : 'inset 0 0 0 1px rgb(var(--glass-edge) / 0.7)',
                }}
              >
                <button
                  type="button"
                  aria-expanded={on}
                  onClick={() => {
                    onFeatureSelect(on ? null : feature);
                    if (!on && id !== undefined) onZoomToFeature(id);
                  }}
                  className="w-full h-[60px] flex items-center gap-2.5 px-3 text-left text-foreground"
                >
                  <span
                    className="cloud-move cloud-spring w-9 h-9 flex-shrink-0 flex items-center justify-center"
                    style={{
                      borderRadius: on ? (idx % 2 ? CAS : CBS) : idx % 2 ? CBS : CAS,
                      background: on ? 'hsl(var(--primary))' : 'rgb(var(--smoke-mid) / 0.55)',
                      color: on ? 'hsl(var(--primary-foreground))' : 'hsl(var(--ember))',
                    }}
                  >
                    <GeomIcon type={geomType} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="text-[15px] font-extrabold truncate">{name}</span>
                    <span className="text-xs text-muted-foreground truncate">{sub}</span>
                  </span>
                  {stat && (
                    <span className="font-mono text-[11px] font-medium text-muted-foreground flex-shrink-0">
                      {stat}
                    </span>
                  )}
                </button>
                {on && (
                  <div className="animate-fade-in-up px-3 pb-3 flex flex-col gap-2">
                    {attrs.length > 0 && (
                      <dl className="grid grid-cols-3 gap-1.5">
                        {attrs.map(([k, v], j) => (
                          <div
                            key={k}
                            className="px-2.5 py-2 bg-smoke-well/70 min-w-0"
                            style={{ borderRadius: j % 2 ? CBS : CAS }}
                          >
                            <dt className="font-mono text-[10px] font-medium text-muted-foreground truncate">
                              {k}
                            </dt>
                            <dd className="mt-0.5 text-[13px] font-extrabold truncate">
                              {String(v)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    <div className="flex gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 rounded-cloud-sa bg-smoke-well/70 font-extrabold"
                        onClick={() => id !== undefined && onZoomToFeature(id)}
                      >
                        <Crosshair className="h-3.5 w-3.5" />
                        Perbesar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 rounded-cloud-sb bg-smoke-well/70 font-extrabold text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setFeatureToDelete(id ?? null)}
                        aria-label={`Hapus fitur ${name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Hapus
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  if (sheet) {
    return (
      <>
        <section
          aria-label="Fitur"
          hidden={!sheet.active}
          className="cloud-move absolute z-30 overflow-y-auto"
          style={{
            left: CLOUD_MOBILE.margin + 12,
            right: CLOUD_MOBILE.margin + 12,
            top: sheet.top + SHEET_TABS_H,
            bottom: CLOUD_MOBILE.margin + CLOUD_MOBILE.footH + 6,
          }}
        >
          <TooltipProvider>{featuresBody}</TooltipProvider>
        </section>
        {deleteDialog}
      </>
    );
  }

  return (
    <>
      {/* Toggle sits in the right piece's tab, under the header's step */}
      <div
        className="absolute z-30 flex items-center justify-center"
        style={{
          right: CLOUD.margin,
          top: CLOUD.margin + CLOUD.stepH + CLOUD.gap,
          width: CLOUD.tabW,
          height: 36,
        }}
      >
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-label={open ? 'Ciutkan manager spasial' : 'Buka manager spasial'}
          aria-expanded={open}
          className={`w-11 h-9 flex items-center justify-center rounded-cloud-sb transition-colors duration-micro ${
            open
              ? 'bg-smoke-mid/55 text-foreground hover:bg-smoke-mid'
              : 'bg-primary text-primary-foreground'
          }`}
        >
          <span
            className="cloud-move cloud-spring flex"
            style={{ transform: `rotate(${open ? 0 : 180}deg)` }}
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </span>
        </button>
      </div>

      <section
        aria-label="Manager spasial"
        className="cloud-move absolute z-30 overflow-hidden select-none"
        style={{ right: CLOUD.margin, top: TOP, bottom: layout.rightBodyBottom, width }}
      >
        <div
          className="cloud-fade absolute inset-y-0 right-0 flex flex-col gap-3 pt-3 pb-[18px] pl-4 pr-[22px]"
          style={{
            width: CLOUD.rightW,
            opacity: open ? 1 : 0,
            pointerEvents: open ? 'auto' : 'none',
            transform: `translateX(${open ? 0 : 40}px)`,
          }}
          aria-hidden={!open}
        >
          <TooltipProvider>
            <h2 className="flex items-center gap-2 text-[17px] font-black">
              <Layers className="h-[18px] w-[18px] text-ember" strokeWidth={1.9} />
              Manager spasial
            </h2>

            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as 'features' | 'layers')}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
            >
              <TabsList className="relative grid grid-cols-2 h-auto flex-shrink-0 p-1 rounded-cloud-b bg-smoke-mid/55">
                <span
                  aria-hidden="true"
                  className="cloud-move cloud-spring absolute top-1 bottom-1 w-[calc(50%-4px)] bg-smoke-well/90 shadow-[0_3px_8px_rgb(var(--shadow-ink)/0.12)]"
                  style={{
                    left: tab === 'features' ? 4 : '50%',
                    borderRadius: tab === 'features' ? CBS : CAS,
                  }}
                />
                <TabsTrigger
                  value="features"
                  className="relative h-9 text-sm font-extrabold text-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Fitur ({features.length})
                </TabsTrigger>
                <TabsTrigger
                  value="layers"
                  className="relative h-9 text-sm font-extrabold text-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Lapisan
                </TabsTrigger>
              </TabsList>

              {/* Features Tab */}
              <TabsContent
                value="features"
                className="flex-1 mt-3 overflow-y-auto min-h-0 -mx-1 px-1"
              >
                {featuresBody}
              </TabsContent>

              {/* Layers Tab */}
              <TabsContent value="layers" className="flex-1 mt-3 overflow-y-auto min-h-0">
                <div className="space-y-5 p-4 rounded-cloud-a bg-smoke-well/50">
                  {/* Vector Layer Controls */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-ember" />
                        <span className="text-sm font-extrabold text-foreground">Data vektor</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onVectorVisibleChange(!vectorVisible)}
                        aria-label="Toggle Vector Visibility"
                      >
                        {vectorVisible ? (
                          <Eye className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between font-mono text-[11px] text-muted-foreground font-medium">
                        <span>Opacity</span>
                        <span>{Math.round(vectorOpacity * 100)}%</span>
                      </div>
                      <Slider
                        value={[vectorOpacity * 100]}
                        max={100}
                        step={1}
                        onValueChange={(vals) => onVectorOpacityChange(vals[0] / 100)}
                        className="py-1.5"
                      />
                    </div>
                  </div>

                  {/* Basemap Controls */}
                  <div className="pt-4 border-t border-foreground/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapIcon className="h-4 w-4 text-ember" />
                        <span className="text-sm font-extrabold text-foreground">Peta dasar</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between font-mono text-[11px] text-muted-foreground font-medium">
                        <span>Opacity</span>
                        <span>{Math.round(basemapOpacity * 100)}%</span>
                      </div>
                      <Slider
                        value={[basemapOpacity * 100]}
                        max={100}
                        step={1}
                        onValueChange={(vals) => onBasemapOpacityChange(vals[0] / 100)}
                        className="py-1.5"
                      />
                    </div>
                  </div>

                  {/* Graticule Grid Controls */}
                  {onToggleGraticule && (
                    <div className="pt-4 border-t border-foreground/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Grid className="h-4 w-4 text-ember" />
                          <div className="flex flex-col">
                            <span className="text-sm font-extrabold text-foreground">
                              Grid koordinat
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Garis lintang & bujur pada kanvas
                            </span>
                          </div>
                        </div>
                        <Switch
                          checked={showGraticule}
                          onCheckedChange={() => onToggleGraticule()}
                          aria-label="Grid koordinat"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <p className="mt-4 px-1 flex flex-wrap gap-x-3 font-mono text-[11px] text-muted-foreground">
                  <a
                    href="https://mikeudev.my.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center min-h-9 hover:text-foreground"
                  >
                    © {new Date().getFullYear()} mikeudev.my.id
                  </a>
                  <a
                    href="https://github.com/mikeu-dev/geovara"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center min-h-9 hover:text-foreground"
                  >
                    GitHub
                  </a>
                </p>
              </TabsContent>
            </Tabs>
          </TooltipProvider>
        </div>

        {/* Collapsed rail: tab shortcuts, then one chip per feature */}
        <div
          className="cloud-fade absolute right-0 top-0 bottom-0 flex flex-col items-center gap-2 pt-3.5 pb-3 overflow-y-auto"
          style={{
            width: CLOUD.tabW,
            opacity: open ? 0 : 1,
            pointerEvents: open ? 'none' : 'auto',
          }}
          aria-hidden={open}
        >
          {(
            [
              ['features', `Buka fitur (${features.length})`, Shapes, CBS],
              ['layers', 'Buka lapisan', Layers, CAS],
            ] as const
          ).map(([id, label, Icon, rad]) => (
            <button
              key={id}
              type="button"
              aria-label={label}
              title={label}
              onClick={() => {
                setTab(id);
                onOpenChange(true);
              }}
              className="relative w-[52px] h-[52px] flex-shrink-0 flex items-center justify-center bg-smoke-mid/55 text-muted-foreground hover:bg-smoke-mid transition-colors"
              style={{ borderRadius: rad }}
            >
              <Icon className="h-5 w-5" strokeWidth={1.7} />
              {id === 'features' && features.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground font-mono text-[10px] font-semibold flex items-center justify-center">
                  {features.length}
                </span>
              )}
            </button>
          ))}
          {features.length > 0 && (
            <span aria-hidden="true" className="w-8 h-px bg-foreground/15 my-1 flex-shrink-0" />
          )}
          {features.slice(0, 8).map((feature, idx) => {
            const { geomType, name } = featureSummary(feature, idx);
            const id = feature.getId();
            const on = id !== undefined && id === selectedId;
            return (
              <button
                key={id ?? idx}
                type="button"
                aria-label={name}
                title={name}
                onClick={() => {
                  onFeatureSelect(feature);
                  if (id !== undefined) onZoomToFeature(id);
                  onOpenChange(true);
                }}
                className="w-[52px] h-[52px] flex-shrink-0 flex items-center justify-center transition-colors"
                style={{
                  borderRadius: on ? (idx % 2 ? CAS : CBS) : idx % 2 ? CBS : CAS,
                  background: on ? 'hsl(var(--primary))' : 'rgb(var(--smoke-mid) / 0.55)',
                  color: on ? 'hsl(var(--primary-foreground))' : 'hsl(var(--ember))',
                }}
              >
                <GeomIcon type={geomType} className="h-5 w-5" />
              </button>
            );
          })}
          {features.length > 8 && (
            <span className="font-mono text-[11px] text-muted-foreground">
              +{features.length - 8}
            </span>
          )}
        </div>
      </section>

      {/* Quick spatial operations in the right piece's foot */}
      <div
        className="cloud-move absolute z-30 flex items-center gap-1.5 px-3.5 overflow-hidden"
        style={{
          bottom: CLOUD.margin,
          height: CLOUD.footH,
          right: CLOUD.margin + width - footW,
          width: footW,
          opacity: footW ? 1 : 0,
          pointerEvents: footW ? 'auto' : 'none',
        }}
        aria-hidden={!footW}
      >
        {(['Buffer', 'Hull'] as const).map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={openSpatialTools}
            className={`flex-none h-[38px] px-3 text-[13px] font-extrabold text-foreground bg-smoke-well/70 hover:bg-smoke-well transition-colors ${
              i % 2 ? 'rounded-cloud-sb' : 'rounded-cloud-sa'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={openSpatialTools}
          aria-label="Operasi spasial lainnya"
          className="flex-none w-[38px] h-[38px] font-black text-foreground rounded-cloud-sb bg-smoke-well/70 hover:bg-smoke-well transition-colors"
        >
          ···
        </button>
      </div>

      {deleteDialog}
    </>
  );
}
