"use client";

import { Card, Text } from "@mantine/core";
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
import type { ActiveUsersData } from "@/lib/api/resources/stats";
import { useStatsPageTranslations } from "@/lib/i18n/generated/hooks";

interface ActiveUsersChartProps {
  data: ActiveUsersData;
}

export function ActiveUsersChart({ data }: ActiveUsersChartProps) {
  const t = useStatsPageTranslations();

  const chartData = data.timeline.map((point, index) => ({
    ...point,
    dateLabel: new Date(point.date).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    }),
    showTick: index % 14 === 0 || index === data.timeline.length - 1,
  }));

  return (
    <Card padding="lg" withBorder>
      <Text fw={500} mb="xs">
        {t("ActiveUsers")}
      </Text>
      <Text c="dimmed" mb="md" size="xs">
        {t("ActiveUsersDescription")}
      </Text>
      <div style={{ height: 320, width: "100%" }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ bottom: 8, left: 0, right: 20, top: 8 }}>
            <CartesianGrid stroke="var(--mantine-color-dark-4)" strokeDasharray="4 4" />
            <XAxis
              axisLine={false}
              dataKey="dateLabel"
              minTickGap={24}
              tick={({ x = 0, y = 0, payload, index }) => {
                const point = chartData[index ?? 0];
                if (!point?.showTick) {
                  return <g />;
                }
                const tickX = typeof x === "number" ? x : Number(x);
                const tickY = typeof y === "number" ? y : Number(y);
                return (
                  <text
                    fill="var(--mantine-color-gray-5)"
                    textAnchor="middle"
                    x={tickX}
                    y={tickY + 12}
                  >
                    {payload?.value}
                  </text>
                );
              }}
            />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={34} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--mantine-color-dark-6)",
                border: "1px solid var(--mantine-color-dark-4)",
                borderRadius: 8,
              }}
              formatter={(value, name) => [
                Number(value).toLocaleString(),
                name === "mau" ? t("MAU") : name === "wau" ? t("WAU") : t("DAU"),
              ]}
              itemStyle={{ color: "var(--mantine-color-gray-1)" }}
              labelFormatter={(_label, payload) => {
                const rawDate = payload?.[0]?.payload?.date;
                return rawDate ? new Date(rawDate).toLocaleDateString() : "";
              }}
              labelStyle={{ color: "var(--mantine-color-gray-3)" }}
            />
            <Legend
              align="right"
              formatter={(value) =>
                value === "mau" ? t("MAU") : value === "wau" ? t("WAU") : t("DAU")
              }
              iconType="circle"
              verticalAlign="top"
              wrapperStyle={{ paddingBottom: 16 }}
            />
            <Line
              activeDot={{ r: 4 }}
              dataKey="mau"
              dot={false}
              stroke="var(--mantine-color-grape-5)"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              activeDot={{ r: 4 }}
              dataKey="wau"
              dot={false}
              stroke="var(--mantine-color-teal-5)"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              activeDot={{ r: 4 }}
              dataKey="dau"
              dot={false}
              stroke="var(--mantine-color-blue-5)"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
