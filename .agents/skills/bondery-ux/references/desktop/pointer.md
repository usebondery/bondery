# Pointer cursor

A control that moves under the pointer shows the drag cursor.

| Surface | At rest | While the drag is active |
|---------|---------|--------------------------|
| Chip or handle the user can drag | `grab` | `grabbing` |
| Canvas or map the user can pan | `grab` | `grabbing` |
| Control that only activates | `pointer` | `pointer` |

Set `grabbing` on the dragged control and on `document.documentElement`. The control's own `cursor` wins over the document, so the control must change too.

Touch has no cursor. This rule is for a mouse or a trackpad.

The people map canvas uses the MapLibre stylesheet (`grab`, and `grabbing` while `:active`). A map person chip opens the person. Leave that chip on `pointer`.
