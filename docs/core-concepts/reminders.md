---
icon: bell
---

# Reminders

Reminders let you track important dates for your contacts and receive timely email notifications so you never miss a moment that matters.

## Important events

Each contact can have one or more important events attached to it. An important event has:

| Field              | Description                                                                         |
| ------------------ | ----------------------------------------------------------------------------------- |
| Event type         | `birthday`, `anniversary`, `nameday`, `graduation`, or `other`                      |
| Event date         | The specific date of the event (day/month, repeating yearly)                        |
| Note               | An optional note about the event                                                    |
| Notify days before | How early you want to be notified: `1`, `3`, or `7` days before, or no notification |

## How notifications are delivered

Bondery uses a scheduled database job (powered by `pg_cron`) that runs hourly. It checks which events are due for notification and sends a daily digest email. Notifications are grouped per user and sent once per day, at the hour you configure in your account settings.

## Notification timing

The exact delivery time depends on two things:

1. The `notify_days_before` value on the event
2. The `reminder_send_hour` preference in your account settings

For example, if your birthday is on March 10 and you set `notify_days_before` to `3`, you will receive an email on March 7 at your configured send hour.

## Related concepts

* [People](people.md) = the people whose dates you are tracking
