'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IScheduledTriggerConfig } from '@/types/agent';
import { scheduledTriggerSchema } from '@/lib/validations/agentValidation';

interface ScheduledTriggerFormProps {
  onSubmit: (trigger: IScheduledTriggerConfig) => void;
  onCancel: () => void;
}

type FrequencyType = 'daily' | 'weekly' | 'monthly';

export function ScheduledTriggerForm({ onSubmit, onCancel }: ScheduledTriggerFormProps) {
  const [frequency, setFrequency] = useState<FrequencyType>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [time, setTime] = useState('09:00');
  const [monthlyDate, setMonthlyDate] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleDayToggle = (dayIndex: number) => {
    setSelectedDays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex].sort()
    );
  };

  const handleSubmit = () => {
    setError(null);

    try {
      const config: any = {
        frequency,
        time
      };

      if (frequency === 'weekly') {
        if (selectedDays.length === 0) {
          setError('Please select at least one day for weekly schedule');
          return;
        }
        config.days = selectedDays;
      } else if (frequency === 'monthly') {
        config.date = monthlyDate;
      }

      const trigger: IScheduledTriggerConfig = {
        type: 'scheduled',
        config,
        enabled: true
      };

      // Validate with schema
      scheduledTriggerSchema.parse(trigger);
      onSubmit(trigger);
    } catch (err: any) {
      setError(err.message || 'Invalid trigger configuration');
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div>
        <h4 className="font-medium mb-2">Scheduled Trigger</h4>
        <p className="text-sm text-muted-foreground">
          Run this agent automatically on a schedule.
        </p>
      </div>

      {/* Frequency Selection */}
      <div className="space-y-2">
        <Label htmlFor="frequency">Frequency</Label>
        <Select value={frequency} onValueChange={(v: string) => setFrequency(v as FrequencyType)}>
          <SelectTrigger id="frequency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Time Input */}
      <div className="space-y-2">
        <Label htmlFor="time">Time</Label>
        <Input
          id="time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-40"
        />
      </div>

      {/* Weekly Days Selection */}
      {frequency === 'weekly' && (
        <div className="space-y-2">
          <Label>Days of Week</Label>
          <div className="grid grid-cols-2 gap-2">
            {dayNames.map((day, index) => (
              <label key={index} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDays.includes(index)}
                  onChange={() => handleDayToggle(index)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">{day}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Date Selection */}
      {frequency === 'monthly' && (
        <div className="space-y-2">
          <Label htmlFor="monthlyDate">Day of Month</Label>
          <Input
            id="monthlyDate"
            type="number"
            min="1"
            max="31"
            value={monthlyDate}
            onChange={(e) => setMonthlyDate(parseInt(e.target.value) || 1)}
            className="w-24"
          />
          <p className="text-xs text-muted-foreground">
            Enter a day between 1-31
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          Add Scheduled Trigger
        </Button>
      </div>
    </div>
  );
}
