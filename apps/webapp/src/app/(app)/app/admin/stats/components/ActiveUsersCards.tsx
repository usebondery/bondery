"use client";

import { Card, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ActiveUsersData } from "../getStatsData";

interface ActiveUsersChartProps {
  data: ActiveUsersData;
}

export function ActiveUsersChart({ data }: ActiveUsersChartProps) {
  const t = useTranslations("StatsPage");

  const chartData = data.timeline.map((point, index) => ({
    ...point,
    dateLabel: new Date(point.date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    showTick: index % 14 === 0 || index === data.timeline.length - 1,
  }));

  return (
    <Card withBorder padding="lg">
      <Text fw={500} mb="xs">
        {t("ActiveUsers")}
      </Text>
      <Text size="xs" c="dimmed" mb="md">
        {t("ActiveUsersDescription")}
      </Text>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
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
            <YAxis tickLine={false} axisLine={false} width={34} allowDecimals={false} />
            <Tooltip
              formatter={(value: number, name: string) => [
                Number(value).toLocaleString(),
                name === "mau" ? t("MAU") : name === "wau" ? t("WAU") : t("DAU"),
              ]}
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
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: 16 }}
              formatter={(value) =>
                value === "mau" ? t("MAU") : value === "wau" ? t("WAU") : t("DAU")
              }
            />
            <Line
              type="monotone"
              dataKey="mau"
              stroke="var(--mantine-color-grape-5)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="wau"
              stroke="var(--mantine-color-teal-5)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="dau"
              stroke="var(--mantine-color-blue-5)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
