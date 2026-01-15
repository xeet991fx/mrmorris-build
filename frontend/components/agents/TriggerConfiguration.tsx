'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Clock, Zap, Hand } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ITriggerConfig } from '@/types/agent';
import { ManualTriggerForm } from './ManualTriggerForm';
import { ScheduledTriggerForm } from './ScheduledTriggerForm';
import { EventTriggerForm } from './EventTriggerForm';
import { cn } from '@/lib/utils';

interface TriggerConfigurationProps {
  triggers: ITriggerConfig[];
  onChange: (triggers: ITriggerConfig[]) => void;
  disabled?: boolean;
}

type TriggerType = 'manual' | 'scheduled' | 'event';

export function TriggerConfiguration({
  triggers,
  onChange,
  disabled = false
}: TriggerConfigurationProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedType, setSelectedType] = useState<TriggerType | null>(null);

  const handleAddTrigger = (trigger: ITriggerConfig) => {
    onChange([...triggers, trigger]);
    setShowAddForm(false);
    setSelectedType(null);
  };

  const handleRemoveTrigger = (index: number) => {
    const newTriggers = triggers.filter((_, i) => i !== index);
    onChange(newTriggers);
  };

  const handleToggleTrigger = (index: number) => {
    const newTriggers = [...triggers];
    const currentEnabled = newTriggers[index].enabled !== false;
    newTriggers[index] = {
      ...newTriggers[index],
      enabled: !currentEnabled
    };
    onChange(newTriggers);
  };

  const getTriggerIcon = (type: TriggerType) => {
    const iconClass = "h-3.5 w-3.5";
    switch (type) {
      case 'manual':
        return <Hand className={iconClass} />;
      case 'scheduled':
        return <Clock className={iconClass} />;
      case 'event':
        return <Zap className={iconClass} />;
    }
  };

  const getTriggerLabel = (trigger: ITriggerConfig): string => {
    switch (trigger.type) {
      case 'manual':
        return 'Manual Trigger';
      case 'scheduled':
        const freq = trigger.config.frequency;
        const time = trigger.config.time;
        if (freq === 'daily') {
          return `Daily at ${time}`;
        } else if (freq === 'weekly') {
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const days = trigger.config.days?.map(d => dayNames[d]).join(', ') || '';
          return `Weekly on ${days} at ${time}`;
        } else {
          return `Monthly on day ${trigger.config.date} at ${time}`;
        }
      case 'event':
        const eventLabel = trigger.config.event.replace('.', ' ').replace('_', ' ');
        const condCount = trigger.config.conditions?.length || 0;
        return `${eventLabel}${condCount > 0 ? ` (${condCount} conditions)` : ''}`;
    }
  };

  const triggerTypeButtons = [
    { type: 'manual' as TriggerType, icon: Hand, label: 'Manual' },
    { type: 'scheduled' as TriggerType, icon: Clock, label: 'Schedule' },
    { type: 'event' as TriggerType, icon: Zap, label: 'Event' }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Triggers</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure when this agent should run
          </p>
        </div>
        {triggers.length > 0 && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            disabled={disabled}
            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      {/* Existing Triggers List */}
      <AnimatePresence mode="popLayout">
        {triggers.map((trigger, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="group flex items-center justify-between p-3 bg-muted/30 border border-border/50 rounded-lg hover:border-border transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center",
                trigger.enabled !== false
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              )}>
                {getTriggerIcon(trigger.type)}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground leading-tight">
                  {getTriggerLabel(trigger)}
                </p>
                <p className="text-[10px] text-muted-foreground capitalize">
                  {trigger.type}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={trigger.enabled !== false}
                onCheckedChange={() => handleToggleTrigger(index)}
                disabled={disabled}
                className="scale-90"
              />
              <button
                onClick={() => handleRemoveTrigger(index)}
                disabled={disabled}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add Trigger Section */}
      {!showAddForm && triggers.length === 0 && (
        <div className="grid grid-cols-3 gap-2">
          {triggerTypeButtons.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => {
                setSelectedType(type);
                setShowAddForm(true);
              }}
              disabled={disabled}
              className="flex flex-col items-center gap-1.5 p-3 border border-dashed border-border/60 rounded-lg text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/30 transition-all disabled:opacity-50"
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Type selector when adding with existing triggers */}
      {showAddForm && !selectedType && (
        <div className="p-3 border border-border/60 rounded-lg bg-muted/20">
          <p className="text-xs text-muted-foreground mb-2">Select trigger type:</p>
          <div className="flex gap-2">
            {triggerTypeButtons.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border/60 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border hover:bg-background transition-all"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
            <button
              onClick={() => setShowAddForm(false)}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Trigger Forms */}
      <AnimatePresence mode="wait">
        {showAddForm && selectedType === 'manual' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ManualTriggerForm
              onSubmit={handleAddTrigger}
              onCancel={() => {
                setShowAddForm(false);
                setSelectedType(null);
              }}
            />
          </motion.div>
        )}

        {showAddForm && selectedType === 'scheduled' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ScheduledTriggerForm
              onSubmit={handleAddTrigger}
              onCancel={() => {
                setShowAddForm(false);
                setSelectedType(null);
              }}
            />
          </motion.div>
        )}

        {showAddForm && selectedType === 'event' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <EventTriggerForm
              onSubmit={handleAddTrigger}
              onCancel={() => {
                setShowAddForm(false);
                setSelectedType(null);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state hint */}
      {triggers.length === 0 && !showAddForm && (
        <p className="text-xs text-muted-foreground text-center py-2">
          At least one trigger is required to activate your agent
        </p>
      )}
    </div>
  );
}

