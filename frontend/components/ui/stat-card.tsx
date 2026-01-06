import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
  iconClassName?: string;
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info";
}

const variantStyles = {
  default: {
    icon: "text-muted-foreground",
    bg: "bg-muted/20",
  },
  primary: {
    icon: "text-primary",
    bg: "bg-primary/10",
  },
  success: {
    icon: "text-success",
    bg: "bg-success/10",
  },
  warning: {
    icon: "text-warning",
    bg: "bg-warning/10",
  },
  danger: {
    icon: "text-destructive",
    bg: "bg-destructive/10",
  },
  info: {
    icon: "text-info",
    bg: "bg-info/10",
  },
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  iconClassName,
  variant = "default",
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className={cn("hover:scale-[1.02] transition-transform duration-200", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
              {trend && (
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-1 rounded-full",
                    trend.value > 0
                      ? "bg-success/10 text-success"
                      : trend.value < 0
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {trend.value > 0 ? "+" : ""}
                  {trend.value}% {trend.label}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-2">{description}</p>
            )}
          </div>
          {Icon && (
            <div className={cn("p-3 rounded-xl", styles.bg)}>
              <Icon className={cn("w-6 h-6", styles.icon, iconClassName)} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
