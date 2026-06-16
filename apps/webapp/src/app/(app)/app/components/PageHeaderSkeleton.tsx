import { Group, Skeleton } from "@mantine/core";

interface PageHeaderSkeletonProps {
  /**
   * Width of the primary (rightmost) action button in px.
   * Omit when the page header has no action buttons.
   */
  primaryActionWidth?: number;
  /**
   * Width of the secondary action element in px.
   * Use for a second button or a SegmentedControl.
   */
  secondaryActionWidth?: number;
}

/**
 * Layout-matched skeleton for PageHeader.
 * Mirrors the real structure: 32px icon + Title order=1 + 28px help circle on the left,
 * optional action skeletons on the right — so there is no shape shift when the
 * real header renders.
 *
 * @param primaryActionWidth - Width of the primary button skeleton (right side).
 * @param secondaryActionWidth - Width of the secondary element skeleton (right side).
 */
export function PageHeaderSkeleton({
  primaryActionWidth,
  secondaryActionWidth,
}: PageHeaderSkeletonProps) {
  const hasActions = Boolean(primaryActionWidth ?? secondaryActionWidth);

  return (
    <Group
      justify={hasActions ? "space-between" : "flex-start"}
      gap="sm"
      mb="xl"
    >
      {/* Left: page icon + title + help icon */}
      <Group gap="sm">
        <Skeleton height={32} width={32} radius="sm" />
        <Skeleton height={32} width={160} radius="sm" />
        <Skeleton height={28} width={28} radius="xl" />
      </Group>

      {/* Right: optional action buttons */}
      {hasActions && (
        <Group gap="sm">
          {secondaryActionWidth && (
            <Skeleton height={36} width={secondaryActionWidth} radius="sm" />
          )}
          {primaryActionWidth && (
            <Skeleton height={36} width={primaryActionWidth} radius="sm" />
          )}
        </Group>
      )}
    </Group>
  );
}
