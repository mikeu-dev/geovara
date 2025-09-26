'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Loader2, Wand2 } from 'lucide-react';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import { useToast } from '@/hooks/use-toast';
import { generateFeatureDescription } from '@/ai/flows/generate-feature-description';

interface FeaturePropertiesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  feature: Feature<Geometry>;
  onDelete: () => void;
  onPropertyChange: (key: string, value: any) => void;
}

export default function FeaturePropertiesDialog({
  isOpen,
  onOpenChange,
  feature,
  onDelete,
  onPropertyChange,
}: FeaturePropertiesDialogProps) {
  const { toast } = useToast();
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (feature) {
      setName(feature.get('name') || '');
      setDescription(feature.get('description') || '');
    }
  }, [feature]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    onPropertyChange('name', newName);
  }
  
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = e.target.value;
    setDescription(newDescription);
    onPropertyChange('description', newDescription);
  }

  const handleGenerateDescription = async () => {
    if (!feature) return;
    setIsGeneratingDesc(true);
    try {
      const featureObject = {
        type: 'Feature',
        geometry: feature.getGeometry()?.getType(),
        properties: { name: feature.get('name') },
      };
      const result = await generateFeatureDescription({ feature: featureObject });
      onPropertyChange('description', result.description);
      setDescription(result.description);
      toast({
        title: 'Description Generated',
        description: 'AI has generated a new description for the feature.',
      });
    } catch (error) {
      console.error('Description generation error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate a description. The service may be temporarily unavailable.',
      });
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  if (!feature) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Feature Properties</DialogTitle>
          <DialogDescription>
            Edit the properties of the selected feature.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="feature-name">Name</Label>
            <Input
              id="feature-name"
              value={name}
              onChange={handleNameChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feature-description">Description</Label>
            <Textarea
              id="feature-description"
              value={description}
              onChange={handleDescriptionChange}
              className="h-24"
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleGenerateDescription}
              disabled={isGeneratingDesc}
            >
              {isGeneratingDesc ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Generate with AI
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
