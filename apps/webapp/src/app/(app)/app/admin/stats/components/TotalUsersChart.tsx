"use client";

import { Card, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TotalUsersData } from "../getStatsData";

interface TotalUsersChartProps {
  data: TotalUsersData;
}

export function TotalUsersChart({ data }: TotalUsersChartProps) {
  const t = useTranslations("StatsPage");

  const chartData = data.timeline.map((point, index) => ({
    ...point,
    dateLabel: new Date(point.date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    showTick: index % 30 === 0 || index === data.timeline.length - 1,
  }));

  return (
    <Card withBorder padding="lg">
      <Text fw={500} mb="xs">
        {t("TotalUsers")}
      </Text>
      <Text size="xs" c="dimmed" mb="md">
        {t("TotalUsersDescription")}
      </Text>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="totalUsersGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--mantine-color-violet-5)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--mantine-color-violet-5)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="var(--mantine-color-dark-4)" />
            <XAxis
              dataKey="dateLabel"
              tickLine={false}
              axisLine={false}
              minTickGap={24}
              tick={({ x, y, payload, index }: any) => {
                const point = chartData[index ?? 0];
                if (!point?.showTick) return <g />;
                return (
                  <text x={x} y={y + 12} textAnchor="middle" fill="var(--mantine-color-gray-5)">
                    {payload.value}
                  </text>
                );
              }}
            />
            <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
            <Tooltip
              formatter={(value) => [Number(value).toLocaleString(), t("TotalUsers")]}
              labelFormatter={(_label, payload) => {
                const rawDate = payload?.[0]?.payload?.date;
                return rawDate ? new Date(rawDate).toLocaleDateString() : "";
              }}
              contentStyle={{
                backgroundColor: "var(--mantine-color-dark-6)",
                border: "1px solid var(--mantine-color-dark-4)",
                borderRadius: 8,
              }}
              itemStyle={{ color: "var(--mantine-color-gray-1)" }}
              labelStyle={{ color: "var(--mantine-color-gray-3)" }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--mantine-color-violet-5)"
              strokeWidth={2}
              fill="url(#totalUsersGradient)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
