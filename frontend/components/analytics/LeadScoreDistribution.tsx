"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface GradeDistribution {
  grade: "A" | "B" | "C" | "D" | "F";
  count: number;
  percentage: number;
}

interface LeadScoreDistributionProps {
  distribution: GradeDistribution[];
  totalLeads: number;
}

const gradeColors = {
  A: "#10b981", // green-500
  B: "#3b82f6", // blue-500
  C: "#f59e0b", // yellow-500
  D: "#f97316", // orange-500
  F: "#6b7280", // gray-500
};

export default function LeadScoreDistribution({
  distribution,
  totalLeads,
}: LeadScoreDistributionProps) {
  if (!distribution || distribution.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No lead scoring data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Lead Score Distribution
        </h3>
        <span className="text-sm text-gray-500">
          Total Leads: <span className="font-bold">{totalLeads}</span>
        </span>
      </div>

      {/* Bar Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={distribution} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="grade"
            tick={{ fill: "#6b7280", fontSize: 14, fontWeight: 600 }}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 12 }}
            label={{ value: "Count", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "8px 12px",
            }}
            formatter={(value: number, name: string, props: any) => [
              `${value} leads (${props.payload.percentage.toFixed(1)}%)`,
              `Grade ${props.payload.grade}`,
            ]}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {distribution.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={gradeColors[entry.grade]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-2">
        {distribution.map((item) => (
          <div
            key={item.grade}
            className="p-3 rounded-lg border-2 text-center"
            style={{ borderColor: gradeColors[item.grade] }}
          >
            <div
              className="text-2xl font-bold mb-1"
              style={{ color: gradeColors[item.grade] }}
            >
              {item.grade}
            </div>
            <div className="text-sm font-semibold text-gray-700">
              {item.count}
            </div>
            <div className="text-xs text-gray-500">
              {item.percentage.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="text-xs text-gray-600 space-y-1 pt-2 border-t">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>A Grade: 80-100 points (Hot leads)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>B Grade: 60-79 points (Warm leads)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span>C Grade: 40-59 points (Moderate interest)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span>D Grade: 20-39 points (Low engagement)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-500"></div>
          <span>F Grade: 0-19 points (Unengaged)</span>
        </div>
      </div>
    </div>
  );
}
