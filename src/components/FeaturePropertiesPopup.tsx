'use client';

import { useState, useEffect, useRef, MouseEvent as ReactMouseEvent } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { Feature as GeoJSONFeature } from 'geojson';
import GeoJSON from 'ol/format/GeoJSON';
import { calculateArea, calculateLength } from '@/lib/spatial';
import { cn } from '@/lib/utils';

const geojsonFormat = new GeoJSON();

interface FeaturePropertiesPopupProps {
  feature: Feature<Geometry>;
  onDelete: (featureId: string | number | undefined) => void;
  onPropertyChange: (featureId: string | number, key: string, value: any) => void;
  children: React.ReactNode;
  onOpenChange: (open: boolean) => void;
}

const getSanitizedProperties = (feature: Feature<Geometry>) => {
  const props = feature.getProperties();
  // Exclude non-serializable or internal properties from the editor
  delete props.geometry;
  return Object.entries(props).filter(([_, value]) =>
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null || (typeof value === 'object' && value !== null && !Array.isArray(value))
  );
};


export default function FeaturePropertiesPopup({
  feature,
  onDelete,
  onPropertyChange,
  children,
  onOpenChange,
}: FeaturePropertiesPopupProps) {
  const [properties, setProperties] = useState(getSanitizedProperties(feature));
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);


  // When the feature changes, update the properties and reset position
  useEffect(() => {
    setProperties(getSanitizedProperties(feature));
    setPosition({ x: 0, y: 0 }); // Reset position when feature changes
  }, [feature]);

  const handleDragStart = (e: ReactMouseEvent<HTMLDivElement, MouseEvent>) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    document.body.style.cursor = 'move';
    document.body.style.userSelect = 'none';
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging) return;
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
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    } else {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  const handlePropertyKeyChange = (oldKey: string, newKey: string) => {
    // Prevent empty keys
    if (!newKey.trim()) return;

    const currentValue = feature.get(oldKey);
    onPropertyChange(feature.getId()!, oldKey, undefined); // Unset the old key
    onPropertyChange(feature.getId()!, newKey, currentValue); // Set the new key with the old value

    // Update local state to reflect the change immediately
    setProperties(prev => prev.map(([key, value]) => key === oldKey ? [newKey, value] : [key, value]));
  };

  const handlePropertyValueChange = (key: string, value: any) => {
    onPropertyChange(feature.getId()!, key, value);
    // Update local state
    setProperties(prev => prev.map(([propKey, propValue]) => propKey === key ? [propKey, value] : [propKey, propValue]));
  };

  const handleAddProperty = () => {
    // Find a unique new property key
    let newKey = `new_property`;
    let i = 1;
    const existingKeys = properties.map(([k]) => k);
    while (existingKeys.includes(newKey)) {
        newKey = `new_property_${i}`;
        i++;
    }
    
    onPropertyChange(feature.getId()!, newKey, '');
    setProperties(prev => [...prev, [newKey, '']]);
  };

  const handleRemoveProperty = (keyToRemove: string) => {
    onPropertyChange(feature.getId()!, keyToRemove, undefined); // Unset property in OpenLayers feature
    setProperties(prev => prev.filter(([key]) => key !== keyToRemove)); // Update local state
  };

  const handleAddSimpleStyle = () => {
    const geometryType = feature.getGeometry()?.getType();
    const styleProps: Record<string, string | number> = {};

    switch (geometryType) {
        case 'Point':
        case 'MultiPoint':
            styleProps['fill'] = '#ff0000';
            styleProps['stroke'] = '#ffffff';
            styleProps['stroke-width'] = 2;
            styleProps['radius'] = 7;
            break;
        case 'LineString':
        case 'MultiLineString':
            styleProps['stroke'] = '#0000ff';
            styleProps['stroke-width'] = 3;
            break;
        case 'Polygon':
        case 'MultiPolygon':
            styleProps['fill'] = 'rgba(0, 0, 255, 0.1)';
            styleProps['stroke'] = '#0000ff';
            styleProps['stroke-width'] = 2;
            break;
        default:
            break;
    }

    const newProperties = [...properties];
    for (const [key, value] of Object.entries(styleProps)) {
        onPropertyChange(feature.getId()!, key, value);
        const existingPropIndex = newProperties.findIndex(([pKey]) => pKey === key);
        if (existingPropIndex > -1) {
            newProperties[existingPropIndex] = [key, value];
        } else {
            newProperties.push([key, value]);
        }
    }
    setProperties(newProperties);
  };
  
  const isColorProperty = (key: string) => ['fill', 'stroke'].includes(key.toLowerCase());

  const calculatedAnalysis = (() => {
    try {
      const geometry = feature.getGeometry();
      if (!geometry) return null;

      const type = geometry.getType();
      const geojson = geojsonFormat.writeFeatureObject(feature) as GeoJSONFeature;

      if (type === 'Polygon' || type === 'MultiPolygon') {
        const area = calculateArea(geojson);
        return {
          label: 'Area',
          value: area > 1000000 
            ? `${(area / 1000000).toFixed(4)} km²` 
            : `${area.toFixed(2)} m²`
        };
      } else if (type === 'LineString' || type === 'MultiLineString') {
        const length = calculateLength(geojson);
        return {
          label: 'Length',
          value: length > 1000 
            ? `${(length / 1000).toFixed(4)} km` 
            : `${length.toFixed(2)} m`
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  })();



  return (
    <Popover open={true} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        ref={popupRef} 
        className="w-80 cursor-default" 
        onOpenAutoFocus={(e) => e.preventDefault()} 
        onPointerDownOutside={() => onOpenChange(false)}
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        >
        <div className="grid gap-4">
          <div className="space-y-2">
            <div 
              className="flex items-center justify-center cursor-move text-muted-foreground py-2"
              onMouseDown={handleDragStart}
            >
              <GripVertical className="h-5 w-5" />
            </div>
            <h4 className="font-medium leading-none text-center -mt-2">Feature Properties</h4>
            <p className="text-sm text-muted-foreground text-center">
              Edit properties or drag to move.
            </p>
          </div>
          <div className="grid gap-2 max-h-64 overflow-y-auto pr-2">
            {properties.map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 group">
                 <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                <Input
                  defaultValue={key}
                  className="font-mono text-xs"
                  onBlur={(e) => {
                      if (e.target.value !== key) {
                        handlePropertyKeyChange(key, e.target.value)
                      }
                  }}
                />
                {isColorProperty(key) ? (
                   <div className="relative flex items-center h-10 w-full">
                     <Input
                       type="color"
                       defaultValue={value || '#000000'}
                       className="absolute inset-0 w-full h-full p-0 border-none appearance-none"
                       onBlur={(e) => handlePropertyValueChange(key, e.target.value)}
                       onChange={(e) => handlePropertyValueChange(key, e.target.value)}
                     />
                     <div className="w-full text-sm px-3 py-2 pointer-events-none">{value}</div>
                   </div>
                ) : (
                    <Input
                      defaultValue={typeof value === 'object' ? JSON.stringify(value) : value}
                      className="text-xs"
                      onBlur={(e) => handlePropertyValueChange(key, e.target.value)}
                    />
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => handleRemoveProperty(key)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
           <Button variant="outline" size="sm" onClick={handleAddProperty}>
            <Plus className="h-4 w-4 mr-2" /> Add Property
          </Button>

          <Button variant="link" size="sm" onClick={handleAddSimpleStyle} className="p-0 h-auto justify-start">
            Add simple style
          </Button>

          {calculatedAnalysis && (
            <div className="mt-2 p-2 bg-muted rounded-md border border-dashed text-xs">
              <span className="font-semibold text-muted-foreground mr-1">{calculatedAnalysis.label}:</span>
              <span className="font-mono">{calculatedAnalysis.value}</span>
            </div>
          )}

          <div className="flex justify-between mt-2">
            <Button variant="destructive" onClick={() => onDelete(feature.getId())}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete Feature
            </Button>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
