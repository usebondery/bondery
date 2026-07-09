import type { ComponentType } from "react";

export type FabSpeedDialLayoutRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FabSpeedDialAction = {
  id: string;
  labelKey: string;
  labelNamespace?: string;
  icon: ComponentType<{ size: number; stroke: string }>;
  onPress: () => void;
  testID?: string;
};

export type FabSpeedDialMenuItemLayout = FabSpeedDialLayoutRect & {
  id: string;
};
