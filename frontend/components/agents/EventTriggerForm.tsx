'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IEventTriggerConfig } from '@/types/agent';

interface EventTriggerFormProps {
  onSubmit: (trigger: IEventTriggerConfig) => void;
  onCancel: () => void;
}

type EventType = 'contact.created' | 'deal.stage_updated' | 'form.submitted';
type OperatorType = '>' | '<' | '=' | '!=' | 'contains';

interface Condition {
  field: string;
  operator: OperatorType;
  value: string;
}

export function EventTriggerForm({ onSubmit, onCancel }: EventTriggerFormProps) {
  const [eventType, setEventType] = useState<EventType>('contact.created');
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [error, setError] = useState<string | null>(null);

  const eventOptions: { value: EventType; label: string }[] = [
    { value: 'contact.created', label: 'Contact Created' },
    { value: 'deal.stage_updated', label: 'Deal Stage Updated' },
    { value: 'form.submitted', label: 'Form Submitted' }
  ];

  const operatorOptions: { value: OperatorType; label: string }[] = [
    { value: '=', label: 'Equals' },
    { value: '!=', label: 'Not Equals' },
    { value: '>', label: 'Greater Than' },
    { value: '<', label: 'Less Than' },
    { value: 'contains', label: 'Contains' }
  ];

  const addCondition = () => {
    setConditions([...conditions, { field: '', operator: '=', value: '' }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, field: keyof Condition, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setConditions(newConditions);
  };

  const handleSubmit = () => {
    setError(null);

    // Validate conditions - both field and value are required
    for (const cond of conditions) {
      if (!cond.field.trim()) {
        setError('All condition fields must be filled');
        return;
      }
      if (!cond.value.trim()) {
        setError('All condition values must be filled');
        return;
      }
    }

    const trigger: IEventTriggerConfig = {
      type: 'event',
      config: {
        event: eventType,
        conditions: conditions.length > 0 ? conditions : undefined
      },
      enabled: true
    };

    onSubmit(trigger);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div>
        <h4 className="font-medium mb-2">Event Trigger</h4>
        <p className="text-sm text-muted-foreground">
          Run this agent when a specific event occurs.
        </p>
      </div>

      {/* Event Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="eventType">Event Type</Label>
        <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
          <SelectTrigger id="eventType">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {eventOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conditions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Conditions (Optional)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCondition}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Condition
          </Button>
        </div>

        {conditions.length > 0 && (
          <div className="space-y-2">
            {conditions.map((condition, index) => (
              <div key={index} className="flex gap-2 items-start p-2 border rounded bg-background">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Field name"
                    value={condition.field}
                    onChange={(e) => updateCondition(index, 'field', e.target.value)}
                  />
                  <Select
                    value={condition.operator}
                    onValueChange={(v) => updateCondition(index, 'operator', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {operatorOptions.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Value"
                    value={condition.value}
                    onChange={(e) => updateCondition(index, 'value', e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCondition(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {conditions.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No conditions added. Event will trigger for all occurrences.
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          Add Event Trigger
        </Button>
      </div>
    </div>
  );
}
