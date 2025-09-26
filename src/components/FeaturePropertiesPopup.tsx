'use client';

import { useState, useEffect, useCallback } from 'react';
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

export default function FeaturePropertiesPopup({
  feature,
  onDelete,
  onPropertyChange,
  children,
  onOpenChange,
}: FeaturePropertiesPopupProps) {

  const getProperties = (feature: Feature<Geometry>) => {
    const props = feature.getProperties();
    // Exclude geometry from the properties list
    delete props.geometry;
    return Object.entries(props);
  }

  const [properties, setProperties] = useState(getProperties(feature));

  useEffect(() => {
    setProperties(getProperties(feature));
  }, [feature]);

  const handlePropertyKeyChange = (oldKey: string, newKey: string, value: any) => {
    if(oldKey !== newKey) {
        onPropertyChange(feature.getId()!, newKey, value);
        onPropertyChange(feature.getId()!, oldKey, undefined); // unset old key
    }
  };

  const handlePropertyValueChange = (key: string, value: any) => {
    onPropertyChange(feature.getId()!, key, value);
  };
  
  const handleAddProperty = () => {
    const newKey = `property_${properties.length + 1}`;
    onPropertyChange(feature.getId()!, newKey, '');
  };
  
  const handleRemoveProperty = (key: string) => {
    onPropertyChange(feature.getId()!, key, undefined); // Unset property
  };

  const handleStyleButtonClick = () => {
    // This is a placeholder for the styling functionality
    alert('Styling functionality to be implemented!');
  };

  return (
    <Popover open={true} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80" onOpenAutoFocus={(e) => e.preventDefault()}>
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
                  value={key}
                  className="font-mono text-xs"
                  onChange={(e) => handlePropertyKeyChange(key, e.target.value, value)}
                />
                <Input
                  value={typeof value === 'object' ? JSON.stringify(value) : value}
                  className="text-xs"
                  onChange={(e) => handlePropertyValueChange(key, e.target.value)}
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveProperty(key)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
           <Button variant="outline" size="sm" onClick={handleAddProperty}>
            <Plus className="h-4 w-4 mr-2" /> Add Property
          </Button>

          <Button variant="link" size="sm" onClick={handleStyleButtonClick} className="p-0 h-auto justify-start">
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
