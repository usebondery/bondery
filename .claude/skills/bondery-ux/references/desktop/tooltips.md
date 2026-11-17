# Tooltips (desktop)

Mantine `Tooltip` on **webapp and website** only. Mobile does not use this component.

## Theme defaults

`bonderyTheme` in `packages/mantine-next/src/theme.ts` sets:

- `multiline: true`
- `withArrow: true`
- `w: "auto"`
- `maw: 300`

Do **not** pass `multiline`, `withArrow`, `w`, or `maw` at the call site unless you need a different value.

```tsx
<Tooltip label={t("...")}>
```

Override `maw` when the default 300px wrap is wrong. Override `w` only when the tooltip must not shrink-wrap (rare). `PersonAvatarTooltip` sets `w="auto"` and `maw="none"` because the label is a `PersonCard` (`minWidth: 300`), not wrapping text.

`HelpButton` uses the theme max width. Pass `tooltipMaxWidth` only to override `maw`.

## Checklist

- [ ] No `multiline`, `withArrow`, `w`, or `maw` on `<Tooltip>` unless overriding the theme
- [ ] Person-card / custom-label tooltips set `w="auto"` and `maw="none"` (or another explicit size)
- [ ] `HelpButton` does not pass `withArrow`; `tooltipMaxWidth` only when the default 300px is too narrow
