"use client"; // 必须在顶部

import React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

// 定义数据结构接口
interface SkillData {
  subject: string;
  A: number;
  fullMark: number;
}

// 接收来自父组件的数据
export function SkillRadar({ data }: { data?: SkillData[] }) {
  // 如果没有数据，使用之前的 Mock 数据作为兜底
  const displayData = data || [
    { subject: "指针/引用", A: 80, fullMark: 100 },
    { subject: "内存管理", A: 65, fullMark: 100 },
    { subject: "STL容器", A: 90, fullMark: 100 },
    { subject: "面向对象", A: 70, fullMark: 100 },
    { subject: "递归算法", A: 55, fullMark: 100 },
    { subject: "异常处理", A: 40, fullMark: 100 },
  ];

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={displayData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#64748b", fontSize: 12 }}
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} />
          <Radar
            name="掌握度"
            dataKey="A"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
