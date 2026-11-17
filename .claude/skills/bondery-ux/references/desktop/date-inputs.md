# Date inputs (desktop / webapp)

Use this when a screen has a start date and an end date.

Mantine props: [`minDate`](https://mantine.dev/dates/date-picker/) and `maxDate` on `DatePicker` / `DatePickerInput`. Both bounds are inclusive.

---

## Start and end must not cross

The start day is on or before the end day.
The end day is on or after the start day.
The same calendar day is valid for both fields.

When one field has a day, the other field disables each day that crosses it.
A disabled day is not selectable.

Set `maxDate` on the start field to the selected end day.
Set `minDate` on the end field to the selected start day.
When the other field is empty, omit that prop.

Preset buttons use the same bound.
Omit each preset that is before `minDate` or after `maxDate`.
The user cannot select that preset.

---

## Show the selected day in the field

The field value is a `YYYY-MM-DD` string.
Pass that string to `DatePickerInput` as `value`.

Store the selected day in field state when the user selects it.
The field displays that day immediately.
The search field uses the same rule: the control holds the visible value.
A URL write may follow. The field displays the day from field state.

The interaction form stores `date` as this string and passes it with `getInputProps`.
