'use client';

import { useState, useEffect } from 'react';
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

  // When the feature changes, update the properties in the state
  useEffect(() => {
    setProperties(getSanitizedProperties(feature));
  }, [feature]);

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


  return (
    <Popover open={true} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80" onOpenAutoFocus={(e) => e.preventDefault()} onPointerDownOutside={() => onOpenChange(false)}>
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Feature Properties</h4>
            <p className="text-sm text-muted-foreground">
              Edit the properties of the selected feature.
            </p>
          </div>
          <div className="grid gap-2 max-h-64 overflow-y-auto">
            {properties.map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 group">
                 <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Input
                  defaultValue={key}
                  className="font-mono text-xs"
                  onBlur={(e) => {
                      if (e.target.value !== key) {
                        handlePropertyKeyChange(key, e.target.value)
                      }
                  }}
                />
                <Input
                  defaultValue={typeof value === 'object' ? JSON.stringify(value) : value}
                  className="text-xs"
                  onBlur={(e) => handlePropertyValueChange(key, e.target.value)}
                />
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
