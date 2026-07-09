"use client";

import { Card, Text } from "@mantine/core";
import type { ReactElement } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TotalUsersData } from "@/lib/api/resources/stats";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";

interface TotalUsersChartProps {
  data: TotalUsersData;
}

interface AxisTickProps {
  index?: number;
  payload?: {
    value?: string | number;
  };
  x?: number;
  y?: number;
}

export function TotalUsersChart({ data }: TotalUsersChartProps) {
  const t = useWebTranslations("StatsPage");

  const chartData = data.timeline.map((point, index) => ({
    ...point,
    dateLabel: new Date(point.date).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    }),
    showTick: index % 30 === 0 || index === data.timeline.length - 1,
  }));

  return (
    <Card padding="lg" withBorder>
      <Text fw={500} mb="xs">
        {t("TotalUsers")}
      </Text>
      <Text c="dimmed" mb="md" size="xs">
        {t("TotalUsersDescription")}
      </Text>
      <div style={{ height: 320, width: "100%" }}>
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ bottom: 8, left: 0, right: 20, top: 8 }}>
            <defs>
              <linearGradient id="totalUsersGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="var(--mantine-color-violet-5)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--mantine-color-violet-5)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--mantine-color-dark-4)" strokeDasharray="4 4" />
            <XAxis
              axisLine={false}
              dataKey="dateLabel"
              minTickGap={24}
              tick={
                (({ x = 0, y = 0, payload, index }: AxisTickProps) => {
                  const point = chartData[index ?? 0];
                  if (!point?.showTick) {
                    return <g />;
                  }
                  return (
                    <text fill="var(--mantine-color-gray-5)" textAnchor="middle" x={x} y={y + 12}>
                      {payload?.value}
                    </text>
                  );
                }) as (props: AxisTickProps) => ReactElement
              }
              tickLine={false}
            />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--mantine-color-dark-6)",
                border: "1px solid var(--mantine-color-dark-4)",
                borderRadius: 8,
              }}
              formatter={(value) => [Number(value).toLocaleString(), t("TotalUsers")]}
              itemStyle={{ color: "var(--mantine-color-gray-1)" }}
              labelFormatter={(_label, payload) => {
                const rawDate = payload?.[0]?.payload?.date;
                return rawDate ? new Date(rawDate).toLocaleDateString() : "";
              }}
              labelStyle={{ color: "var(--mantine-color-gray-3)" }}
            />
            <Area
              activeDot={{ r: 4 }}
              dataKey="total"
              dot={false}
              fill="url(#totalUsersGradient)"
              stroke="var(--mantine-color-violet-5)"
              strokeWidth={2}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
