'use client';

import { measureFeature } from '@/lib/measure';
import { useState, useEffect, useRef, MouseEvent as ReactMouseEvent } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, GripVertical, Palette } from 'lucide-react';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import {
  getDefaultSimpleStyle,
  isColorProperty,
  normalizeToHexColor,
} from '@/lib/simplestyle';


interface FeaturePropertiesPopupProps {
  feature: Feature<Geometry>;
  onDelete: (featureId: string | number | undefined) => void;
  onPropertyChange: (
    featureId: string | number,
    key: string,
    value: string | number | boolean | null | undefined | object
  ) => void;
  children: React.ReactNode;
  onOpenChange: (open: boolean) => void;
}

const getSanitizedProperties = (feature: Feature<Geometry>): [string, unknown][] => {
  const props = { ...feature.getProperties() };
  // Exclude internal OpenLayers geometry and system properties
  delete props.geometry;
  return Object.entries(props).filter(
    ([, value]) =>
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null ||
      (typeof value === 'object' && value !== null && !Array.isArray(value))
  );
};

export default function FeaturePropertiesPopup({
  feature,
  onDelete,
  onPropertyChange,
  children,
  onOpenChange,
}: FeaturePropertiesPopupProps) {
  const [properties, setProperties] = useState<[string, unknown][]>(() =>
    getSanitizedProperties(feature)
  );
  const [prevFeature, setPrevFeature] = useState<Feature<Geometry>>(feature);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);

  // Synchronize properties and reset position when feature instance changes
  if (feature !== prevFeature) {
    setPrevFeature(feature);
    setProperties(getSanitizedProperties(feature));
    setPosition({ x: 0, y: 0 });
  }

  const handleDragStart = (e: ReactMouseEvent<HTMLDivElement, MouseEvent>) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    document.body.style.cursor = 'move';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleDragMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isDragging]);

  const handlePropertyKeyChange = (oldKey: string, newKey: string) => {
    const trimmed = newKey.trim();
    if (!trimmed || trimmed === oldKey) return;

    const currentValue = feature.get(oldKey);
    onPropertyChange(feature.getId()!, oldKey, undefined); // Unset old
    onPropertyChange(feature.getId()!, trimmed, currentValue); // Set new

    setProperties((prev) =>
      prev.map(([k, v]) => (k === oldKey ? [trimmed, v] : [k, v]))
    );
  };

  const handlePropertyValueChange = (
    key: string,
    value: string | number | boolean | null | undefined | object
  ) => {
    onPropertyChange(feature.getId()!, key, value);
    setProperties((prev) =>
      prev.map(([propKey, propValue]) =>
        propKey === key ? [propKey, value] : [propKey, propValue]
      )
    );
  };

  const handleAddProperty = () => {
    let newKey = `new_property`;
    let i = 1;
    const existingKeys = properties.map(([k]) => k);
    while (existingKeys.includes(newKey)) {
      newKey = `new_property_${i}`;
      i++;
    }

    onPropertyChange(feature.getId()!, newKey, '');
    setProperties((prev) => [...prev, [newKey, '']]);
  };

  const handleRemoveProperty = (keyToRemove: string) => {
    onPropertyChange(feature.getId()!, keyToRemove, undefined);
    setProperties((prev) => prev.filter(([k]) => k !== keyToRemove));
  };

  const handleAddSimpleStyle = () => {
    const geometryType = feature.getGeometry()?.getType();
    const defaultStyles = getDefaultSimpleStyle(geometryType);

    const updatedPropsMap = new Map<string, unknown>(properties);

    for (const [key, value] of Object.entries(defaultStyles)) {
      onPropertyChange(feature.getId()!, key, value);
      updatedPropsMap.set(key, value);
    }

    setProperties(Array.from(updatedPropsMap.entries()));
  };

  const calculatedAnalysis = (() => {
    const m = measureFeature(feature);
    if (!m || m.kind === 'point') return null;
    return { label: m.kind === 'area' ? 'Luas' : 'Panjang', value: m.label };
  })();

  return (
    <Popover open={true} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        ref={popupRef}
        side="top"
        sideOffset={8}
        collisionPadding={{ top: 104, bottom: 24, left: 16, right: 16 }}
        className="w-84 cursor-default border-0 rounded-cloud-a glass-smoke shadow-[0_10px_24px_rgb(var(--shadow-ink)/0.18),inset_0_0_0_1.5px_rgb(var(--glass-edge)/0.8)] animate-cloud-pop"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={() => onOpenChange(false)}
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      >
        <div className="grid gap-3">
          <div className="space-y-1">
            <div
              className="flex items-center justify-center cursor-move text-muted-foreground/60 hover:text-muted-foreground py-1"
              onMouseDown={handleDragStart}
              title="Seret untuk memindahkan"
            >
              <GripVertical className="h-4 w-4" />
            </div>
            <h4 className="font-black text-base leading-none text-center">Properti fitur</h4>
            <p className="font-mono text-[11px] text-muted-foreground text-center">
              Ubah atribut, warna, atau gaya simplestyle.
            </p>
          </div>

          <div className="grid gap-2 max-h-60 overflow-y-auto pr-1">
            {properties.map(([key, value]) => {
              const isColor = isColorProperty(key, value);
              return (
                <div key={key} className="flex items-center gap-1.5 group">
                  <Input
                    value={key}
                    className="font-mono text-xs w-28 flex-shrink-0 h-8"
                    onChange={(e) => {
                      const newK = e.target.value;
                      setProperties((prev) =>
                        prev.map(([k, v]) => (k === key ? [newK, v] : [k, v]))
                      );
                    }}
                    onBlur={(e) => handlePropertyKeyChange(key, e.target.value)}
                  />

                  {isColor ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <input
                        type="color"
                        value={normalizeToHexColor(value)}
                        onChange={(e) =>
                          handlePropertyValueChange(key, e.target.value)
                        }
                        className="w-8 h-8 p-0.5 border border-border rounded cursor-pointer flex-shrink-0 bg-transparent"
                        title="Pilih warna"
                      />
                      <Input
                        value={
                          typeof value === 'object'
                            ? JSON.stringify(value)
                            : String(value ?? '')
                        }
                        className="font-mono text-xs h-8 flex-1 min-w-0"
                        onChange={(e) =>
                          handlePropertyValueChange(key, e.target.value)
                        }
                      />
                    </div>
                  ) : (
                    <Input
                      value={
                        typeof value === 'object'
                          ? JSON.stringify(value)
                          : String(value ?? '')
                      }
                      className="text-xs h-8 flex-1 min-w-0"
                      onChange={(e) =>
                        handlePropertyValueChange(key, e.target.value)
                      }
                    />
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0 rounded-cloud-sb text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => handleRemoveProperty(key)}
                    aria-label={`Hapus properti ${key}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddProperty}
              className="text-xs font-extrabold h-9 rounded-cloud-sa border-0 bg-smoke-well/70 hover:bg-smoke-well"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Tambah properti
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddSimpleStyle}
              className="text-xs h-9 rounded-cloud-sb bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary font-extrabold"
            >
              <Palette className="h-3.5 w-3.5 mr-1.5 text-primary" /> Tambah gaya
            </Button>
          </div>

          {calculatedAnalysis && (
            <div className="px-3 py-2 bg-smoke-well/70 rounded-cloud-b text-xs flex justify-between items-center">
              <span className="font-medium text-muted-foreground">
                {calculatedAnalysis.label}:
              </span>
              <span className="font-mono font-semibold">{calculatedAnalysis.value}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-1">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(feature.getId())}
              className="text-xs font-extrabold h-9 rounded-cloud-sa"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Hapus fitur
            </Button>
            <Button
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs font-extrabold h-9 rounded-cloud-sb"
            >
              Selesai
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
