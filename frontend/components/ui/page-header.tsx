import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          {Icon && (
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Icon className="w-6 h-6" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight mb-2">{title}</h1>
            {description && (
              <p className="text-muted-foreground text-base max-w-3xl">
                {description}
              </p>
            )}
          </div>
        </div>
        {children && <div className="flex items-center gap-3">{children}</div>}
      </div>
    </div>
  );
}
