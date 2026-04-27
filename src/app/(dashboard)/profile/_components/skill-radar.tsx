"use client";

import React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

interface SkillData {
  subject: string;
  A: number;
  fullMark: number;
}

export function SkillRadar({ data }: { data?: SkillData[] }) {
  const subjects = ["指针/引用", "内存管理", "STL容器", "面向对象", "递归算法", "异常处理"];
  const defaultData = subjects.map((subject) => ({ subject, A: 0, fullMark: 100 }));
  const renderData = data ?? defaultData;
  const isEmpty = renderData.every((item) => item.A === 0);

  return (
    <div style={{ width: "100%", height: "400px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart
          cx="50%"
          cy="50%"
          outerRadius="80%"
          data={renderData}
        >
          {/* 关键：用 PolarGrid 自带的网格，和雷达完全对齐 */}
          <PolarGrid
            stroke="#ffffff"
            strokeOpacity={0.25}
            strokeWidth={1}
          />

          <PolarAngleAxis
            dataKey="subject"
            tick={{
              fill: "#ffffff",
              fontSize: 13,
              fontWeight: 500,
            }}
          />

          <PolarRadiusAxis
            domain={[0, 100]}
            tick={false}
            axisLine={false}
            tickLine={false}
          />

          {!isEmpty && (
            <Radar
              name="掌握度"
              dataKey="A"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.5}
              strokeWidth={2}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}