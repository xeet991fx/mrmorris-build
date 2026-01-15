'use client';

import { Button } from '@/components/ui/button';
import { IManualTriggerConfig } from '@/types/agent';

interface ManualTriggerFormProps {
  onSubmit: (trigger: IManualTriggerConfig) => void;
  onCancel: () => void;
}

export function ManualTriggerForm({ onSubmit, onCancel }: ManualTriggerFormProps) {
  const handleSubmit = () => {
    const trigger: IManualTriggerConfig = {
      type: 'manual',
      config: {},
      enabled: true
    };
    onSubmit(trigger);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div>
        <h4 className="font-medium mb-2">Manual Trigger</h4>
        <p className="text-sm text-muted-foreground">
          This agent can only be triggered manually via the "Run Now" button.
          No additional configuration needed.
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          Add Manual Trigger
        </Button>
      </div>
    </div>
  );
}
