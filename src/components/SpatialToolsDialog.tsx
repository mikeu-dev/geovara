'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  generateBuffer,
  simplifyGeoJSON,
  generateConvexHull,
  generateCentroids,
  unkinkPolygons,
  booleanUnionPolygons,
  generateMultiRingBuffer,
  type SpatialUnit,
} from '@/lib/spatial-operations';
import type { FeatureCollection } from 'geojson';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sparkles, ShieldAlert, Maximize2, Compass, Merge, Radar } from 'lucide-react';

interface SpatialToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  geojson: FeatureCollection;
  onApplyGeoJSON: (newGeoJSON: FeatureCollection, replace: boolean) => void;
  selectedFeatureId?: string | number | null;
}

export default function SpatialToolsDialog({
  open,
  onOpenChange,
  geojson,
  onApplyGeoJSON,
  selectedFeatureId,
}: SpatialToolsDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<
    'buffer' | 'simplify' | 'hull' | 'centroid' | 'unkink' | 'union' | 'rings'
  >('buffer');
  const [targetScope, setTargetScope] = useState<'all' | 'selected'>('all');
  const [outputMode, setOutputMode] = useState<'add' | 'replace'>('add');

  // Buffer state
  const [bufferDistance, setBufferDistance] = useState<number>(100);
  const [bufferUnits, setBufferUnits] = useState<SpatialUnit>('meters');

  // Multi-Ring state
  const [ringDistancesInput, setRingDistancesInput] = useState<string>('100, 300, 500');
  const [ringUnits, setRingUnits] = useState<SpatialUnit>('meters');

  // Simplify state
  const [simplifyTolerance, setSimplifyTolerance] = useState<number>(0.001);
  const [simplifyHighQuality, setSimplifyHighQuality] = useState<boolean>(true);

  const selectedFeature = geojson.features.find((f) => f.id === selectedFeatureId);

  const getTargetData = (): FeatureCollection => {
    if (targetScope === 'selected' && selectedFeature) {
      return {
        type: 'FeatureCollection',
        features: [selectedFeature],
      };
    }
    return geojson;
  };

  const handleExecute = () => {
    const targetData = getTargetData();
    if (!targetData.features || targetData.features.length === 0) {
      toast({
        title: 'Tidak ada fitur untuk diproses',
        description: 'Pastikan peta memiliki setidaknya satu geometri aktif.',
        variant: 'destructive',
      });
      return;
    }

    let resultCollection: FeatureCollection | null = null;

    try {
      switch (activeTab) {
        case 'buffer': {
          resultCollection = generateBuffer(targetData, bufferDistance, bufferUnits);
          resultCollection.features.forEach((f, idx) => {
            f.id = `buffer_${Date.now()}_${idx}`;
            f.properties = {
              ...(f.properties || {}),
              _operation: 'buffer',
              _distance: `${bufferDistance} ${bufferUnits}`,
              fill: 'rgba(59, 130, 246, 0.25)',
              stroke: '#3b82f6',
              strokeWidth: 2,
            };
          });
          break;
        }
        case 'rings': {
          const rawDists = ringDistancesInput
            .split(',')
            .map((s) => parseFloat(s.trim()))
            .filter((n) => !isNaN(n) && n > 0);

          if (rawDists.length === 0) {
            toast({
              title: 'Jarak ring tidak valid',
              description: 'Masukkan setidaknya satu angka jarak (misal: 100, 300, 500).',
              variant: 'destructive',
            });
            return;
          }
          const centerFeat = targetData.features[0];
          resultCollection = generateMultiRingBuffer(centerFeat, rawDists, ringUnits);
          break;
        }
        case 'simplify': {
          resultCollection = simplifyGeoJSON(targetData, simplifyTolerance, simplifyHighQuality);
          break;
        }
        case 'hull': {
          const hullFeature = generateConvexHull(targetData);
          if (hullFeature) {
            hullFeature.id = `hull_${Date.now()}`;
            hullFeature.properties = {
              _operation: 'convex_hull',
              name: 'Convex Hull Boundary',
              fill: 'rgba(234, 88, 12, 0.2)',
              stroke: '#ea580c',
              strokeWidth: 2,
            };
            resultCollection = {
              type: 'FeatureCollection',
              features: [hullFeature],
            };
          } else {
            toast({
              title: 'Gagal membuat Convex Hull',
              description: 'Dibutuhkan setidaknya 3 titik atau poligon non-kolinier.',
              variant: 'destructive',
            });
            return;
          }
          break;
        }
        case 'centroid': {
          resultCollection = generateCentroids(targetData);
          resultCollection.features.forEach((f) => {
            f.properties = {
              ...(f.properties || {}),
              fill: '#10b981',
              stroke: '#ffffff',
              strokeWidth: 2,
            };
          });
          break;
        }
        case 'unkink': {
          resultCollection = unkinkPolygons(targetData);
          break;
        }
        case 'union': {
          const mergedFeature = booleanUnionPolygons(targetData);
          if (mergedFeature) {
            mergedFeature.id = `union_${Date.now()}`;
            mergedFeature.properties = {
              ...(mergedFeature.properties || {}),
              _operation: 'union',
              fill: 'rgba(217, 115, 58, 0.25)',
              stroke: '#D9733A',
              strokeWidth: 2,
            };
            resultCollection = {
              type: 'FeatureCollection',
              features: [mergedFeature],
            };
          } else {
            toast({
              title: 'Gagal menggabungkan poligon',
              description: 'Pastikan terdapat setidaknya satu atau lebih poligon aktif.',
              variant: 'destructive',
            });
            return;
          }
          break;
        }
      }

      if (resultCollection) {
        onApplyGeoJSON(resultCollection, outputMode === 'replace');
        toast({
          title: 'Operasi Spasial Berhasil',
          description: `Memproses ${resultCollection.features.length} fitur baru (${activeTab}).`,
        });
        onOpenChange(false);
      }
    } catch (err) {
      toast({
        title: 'Error saat menjalankan kalkulasi spasial',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Spatial Analysis Toolkit
          </DialogTitle>
          <DialogDescription>
            Jalankan transformasi geometris deterministik dan analisis jangkauan spasial langsung di
            browser.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as typeof activeTab)}
          className="w-full"
        >
          <TabsList className="grid grid-cols-7 w-full">
            <TabsTrigger value="buffer" className="text-[11px] px-1">
              Buffer
            </TabsTrigger>
            <TabsTrigger value="rings" className="text-[11px] px-1">
              Rings
            </TabsTrigger>
            <TabsTrigger value="simplify" className="text-[11px] px-1">
              Simplify
            </TabsTrigger>
            <TabsTrigger value="hull" className="text-[11px] px-1">
              Hull
            </TabsTrigger>
            <TabsTrigger value="centroid" className="text-[11px] px-1">
              Centroid
            </TabsTrigger>
            <TabsTrigger value="unkink" className="text-[11px] px-1">
              Unkink
            </TabsTrigger>
            <TabsTrigger value="union" className="text-[11px] px-1">
              Union
            </TabsTrigger>
          </TabsList>

          {/* Scope Target */}
          <div className="mt-4 p-3 bg-muted/40 rounded-lg border border-border flex flex-col gap-2">
            <Label className="text-xs font-semibold text-foreground">Target Geometri</Label>
            <RadioGroup
              value={targetScope}
              onValueChange={(v) => setTargetScope(v as 'all' | 'selected')}
              className="flex gap-4 text-xs"
            >
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="all" id="scope-all" />
                <Label htmlFor="scope-all" className="cursor-pointer text-xs">
                  Semua Fitur ({geojson.features.length})
                </Label>
              </div>
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="selected" id="scope-selected" disabled={!selectedFeature} />
                <Label
                  htmlFor="scope-selected"
                  className={`text-xs cursor-pointer ${
                    !selectedFeature ? 'text-muted-foreground line-through' : ''
                  }`}
                >
                  Fitur Terpilih{' '}
                  {selectedFeature ? `(${selectedFeature.id || 'Aktif'})` : '(Belum dipilih)'}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* TAB BUFFER */}
          <TabsContent value="buffer" className="space-y-4 pt-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <Label className="text-xs">Jarak Buffer</Label>
                <span className="font-semibold text-primary">
                  {bufferDistance} {bufferUnits}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  min="0.1"
                  step="any"
                  value={bufferDistance}
                  onChange={(e) => setBufferDistance(parseFloat(e.target.value) || 0)}
                  className="col-span-2 text-xs"
                />
                <Select
                  value={bufferUnits}
                  onValueChange={(val) => setBufferUnits(val as SpatialUnit)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meters">Meters</SelectItem>
                    <SelectItem value="kilometers">Kilometers</SelectItem>
                    <SelectItem value="miles">Miles</SelectItem>
                    <SelectItem value="feet">Feet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Slider
                value={[bufferDistance]}
                min={1}
                max={bufferUnits === 'meters' ? 5000 : 50}
                step={bufferUnits === 'meters' ? 10 : 0.5}
                onValueChange={(v) => setBufferDistance(v[0])}
                className="py-2"
              />
            </div>
          </TabsContent>

          {/* TAB MULTI-RING BUFFER */}
          <TabsContent value="rings" className="space-y-4 pt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Radar className="w-4 h-4 text-primary" />
              Menghasilkan cincin jangkauan konsentris bertingkat dari titik acuan.
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Interval Jarak (pisahkan dengan koma)</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="text"
                  value={ringDistancesInput}
                  onChange={(e) => setRingDistancesInput(e.target.value)}
                  placeholder="100, 300, 500"
                  className="col-span-2 text-xs"
                />
                <Select value={ringUnits} onValueChange={(val) => setRingUnits(val as SpatialUnit)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meters">Meters</SelectItem>
                    <SelectItem value="kilometers">Kilometers</SelectItem>
                    <SelectItem value="miles">Miles</SelectItem>
                    <SelectItem value="feet">Feet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-2.5 bg-secondary/50 rounded text-[11px] text-muted-foreground">
                Menghasilkan zonasi jangkauan radial dengan gradasi warna (*heat spectrum*) untuk
                analisis aksesibilitas fasilitas atau radius bahaya.
              </div>
            </div>
          </TabsContent>

          {/* TAB SIMPLIFY */}
          <TabsContent value="simplify" className="space-y-4 pt-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <Label className="text-xs">Toleransi Douglas-Peucker</Label>
                <span className="font-semibold text-primary">{simplifyTolerance}</span>
              </div>
              <Slider
                value={[simplifyTolerance]}
                min={0.0001}
                max={0.05}
                step={0.0005}
                onValueChange={(v) => setSimplifyTolerance(v[0])}
                className="py-2"
              />
              <div className="flex items-center justify-between pt-2">
                <div className="flex flex-col">
                  <span className="text-xs font-medium">Preservasi Topologi Tinggi (HQ)</span>
                  <span className="text-[11px] text-muted-foreground">
                    Mencegah penyusutan bentuk berlebih
                  </span>
                </div>
                <Switch checked={simplifyHighQuality} onCheckedChange={setSimplifyHighQuality} />
              </div>
            </div>
          </TabsContent>

          {/* TAB CONVEX HULL */}
          <TabsContent value="hull" className="space-y-4 pt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Maximize2 className="w-4 h-4 text-primary" />
              Menghitung selubung poligon cembung terluar (Minimum Bounding Convex Envelope).
            </div>
            <div className="p-3 bg-secondary/50 rounded text-xs text-muted-foreground leading-relaxed">
              Convex Hull bertindak seperti pita karet yang diregangkan mengelilingi seluruh
              himpunan koordinat untuk mengidentifikasi batas perimeter terjauh.
            </div>
          </TabsContent>

          {/* TAB CENTROID */}
          <TabsContent value="centroid" className="space-y-4 pt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Compass className="w-4 h-4 text-primary" />
              Menghitung titik pusat geometris (Center of Mass) untuk setiap fitur.
            </div>
            <div className="p-3 bg-secondary/50 rounded text-xs text-muted-foreground leading-relaxed">
              Menghasilkan satu fitur Point untuk setiap garis atau poligon, mempermudah pelabelan
              dan analisis kedekatan jarak.
            </div>
          </TabsContent>

          {/* TAB UNKINK */}
          <TabsContent value="unkink" className="space-y-4 pt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldAlert className="w-4 h-4 text-primary" />
              Memperbaiki poligon yang bersilangan sendiri (Self-Intersecting Kink).
            </div>
            <div className="p-3 bg-secondary/50 rounded text-xs text-muted-foreground leading-relaxed">
              Memecah poligon kompleks dengan simpul saling-silang menjadi kumpulan poligon
              sederhana yang valid sesuai standar OGC / RFC 7946.
            </div>
          </TabsContent>

          {/* TAB UNION */}
          <TabsContent value="union" className="space-y-4 pt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Merge className="w-4 h-4 text-primary" />
              Menggabungkan beberapa poligon yang bertumpukan menjadi satu poligon tunggal (Boolean
              Union).
            </div>
            <div className="p-3 bg-secondary/50 rounded text-xs text-muted-foreground leading-relaxed">
              Operasi Union menyatukan batas-batas luar dan menghapus garis pemisah internal pada
              poligon-poligon yang saling bersentuhan atau tumpang tindih.
            </div>
          </TabsContent>

          {/* Output Mode Selection */}
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <Label className="text-xs font-semibold">Tindakan Output:</Label>
            <RadioGroup
              value={outputMode}
              onValueChange={(v) => setOutputMode(v as 'add' | 'replace')}
              className="flex gap-4 text-xs"
            >
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="add" id="out-add" />
                <Label htmlFor="out-add" className="cursor-pointer text-xs font-normal">
                  Tambahkan ke Peta
                </Label>
              </div>
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="replace" id="out-replace" />
                <Label
                  htmlFor="out-replace"
                  className="cursor-pointer text-xs font-normal text-destructive"
                >
                  Gantikan Dataset
                </Label>
              </div>
            </RadioGroup>
          </div>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button size="sm" onClick={handleExecute} className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Jalankan Operasi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
