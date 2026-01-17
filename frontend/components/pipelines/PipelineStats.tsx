import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  CurrencyDollarIcon,
  TrophyIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";
import { usePipelineStore } from "@/store/usePipelineStore";

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ElementType;
  color: "emerald" | "blue" | "amber" | "red" | "violet" | "zinc";
  delay?: number;
}

function StatCard({ label, value, sublabel, icon: Icon, color, delay = 0 }: StatCardProps) {
  const colorClasses = {
    emerald: "text-emerald-500 bg-emerald-500/10",
    blue: "text-blue-500 bg-blue-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    red: "text-red-500 bg-red-500/10",
    violet: "text-violet-500 bg-violet-500/10",
    zinc: "text-zinc-500 bg-zinc-500/10",
  };

  const valueColorClasses = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    blue: "text-blue-600 dark:text-blue-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
    violet: "text-violet-600 dark:text-violet-400",
    zinc: "text-zinc-900 dark:text-zinc-100",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex items-center gap-3"
    >
      <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className={`text-lg font-bold ${valueColorClasses[color]}`}>
          {value}
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
          {label}
          {sublabel && <span className="ml-1 text-zinc-400 dark:text-zinc-500">({sublabel})</span>}
        </div>
      </div>
    </motion.div>
  );
}

export default function PipelineStats() {
  const { kanbanData, currentPipeline } = usePipelineStore();

  const stats = useMemo(() => {
    if (!kanbanData || !kanbanData.stages || kanbanData.stages.length === 0) {
      return null;
    }

    // Flatten all opportunities
    const allOpportunities = kanbanData.stages.flatMap((s) => s.opportunities || []);

    if (allOpportunities.length === 0) {
      return null;
    }

    // Calculate stats
    const totalValue = allOpportunities.reduce((sum, opp) => sum + (opp.value || 0), 0);
    const openDeals = allOpportunities.filter((o) => o.status === "open");
    const wonDeals = allOpportunities.filter((o) => o.status === "won");
    const lostDeals = allOpportunities.filter((o) => o.status === "lost");

    const openValue = openDeals.reduce((sum, opp) => sum + (opp.value || 0), 0);
    const wonValue = wonDeals.reduce((sum, opp) => sum + (opp.value || 0), 0);

    // Weighted pipeline (value * probability)
    const weightedValue = openDeals.reduce((sum, opp) => {
      const probability = opp.probability ?? 50; // Default 50% if not set
      return sum + (opp.value || 0) * (probability / 100);
    }, 0);

    // Win rate (won / (won + lost))
    const closedDeals = wonDeals.length + lostDeals.length;
    const winRate = closedDeals > 0 ? (wonDeals.length / closedDeals) * 100 : 0;

    // Average deal size
    const avgDealSize = allOpportunities.length > 0
      ? totalValue / allOpportunities.length
      : 0;

    return {
      totalValue,
      openValue,
      wonValue,
      weightedValue,
      totalDeals: allOpportunities.length,
      openDeals: openDeals.length,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length,
      winRate,
      avgDealSize,
    };
  }, [kanbanData]);

  if (!currentPipeline || !stats) {
    return null;
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 sm:px-6 lg:px-8 pb-4"
    >
      <div className="flex flex-wrap items-center gap-6 sm:gap-8 py-3 px-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-100 dark:border-zinc-800">
        <StatCard
          label="Open Pipeline"
          value={formatCurrency(stats.openValue)}
          sublabel={`${stats.openDeals} deals`}
          icon={CurrencyDollarIcon}
          color="blue"
          delay={0}
        />

        <StatCard
          label="Weighted Value"
          value={formatCurrency(stats.weightedValue)}
          icon={ScaleIcon}
          color="violet"
          delay={0.05}
        />

        <StatCard
          label="Won"
          value={formatCurrency(stats.wonValue)}
          sublabel={`${stats.wonDeals} deals`}
          icon={TrophyIcon}
          color="emerald"
          delay={0.1}
        />

        <StatCard
          label="Win Rate"
          value={`${stats.winRate.toFixed(0)}%`}
          icon={ChartBarIcon}
          color={stats.winRate >= 30 ? "emerald" : stats.winRate >= 15 ? "amber" : "red"}
          delay={0.15}
        />

        <StatCard
          label="Lost"
          value={stats.lostDeals.toString()}
          sublabel="deals"
          icon={XCircleIcon}
          color="red"
          delay={0.2}
        />

        <StatCard
          label="Avg Deal Size"
          value={formatCurrency(stats.avgDealSize)}
          icon={ClockIcon}
          color="zinc"
          delay={0.25}
        />
      </div>
    </motion.div>
  );
}
