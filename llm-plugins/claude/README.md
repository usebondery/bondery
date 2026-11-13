# Bondery

> Bondery is a personal relationship manager (PRM), a buddy for the relationships that matter. Ask for a brief before you meet someone, to save a conversation, or for who to reach out to.

Bondery keeps the people you know, what you talked about, and when you last reached out. A PRM is a quiet place for that, not a sales pipeline. Then it nudges you at the right moment.

This plugin gives the assistant five everyday jobs: catch up before a meeting, learn about someone before you meet, save a conversation, find who to reach out to, and share a contact.

## What it does

- **Catch up.** Ask for a brief before a meeting or a call. The assistant reads the person, your history with them, their dates, relationships, groups, and tags.
- **Get to know someone.** Ask what someone does, what you have in common, and who you both know. The assistant researches one person deeply and reports back.
- **Remember.** Tell the assistant about a person or a conversation. The assistant saves the contact, the note, and the interaction.
- **Reach out.** Ask who you should contact this week. The assistant lists who is overdue on keep-in-touch and whose dates are coming up.
- **Share a person.** Ask the assistant to email a contact card to a colleague after you confirm the recipients and fields.

Catch up, get to know, and reach out only read. Remember and share write, and they need **Full access**.

## Connect

1. Install the plugin in Claude.
2. Open **Connectors**.
3. Choose **Connect** on the Bondery connector.
4. Choose **Use Claude's published identity**.
5. Sign in to your Bondery account.
6. Approve **Read only** or **Full access**.

Install does not sign you in. **Register automatically** cannot sign in either, so use **Use Claude's published identity**. Then sign in again if Claude asks.

On a Team or Enterprise plan, an Owner adds the connector first. Each member then signs in with their own account.

To connect a self-hosted API instead, add `{apiBaseUrl}/mcp` as a custom connector in Claude.

## What data leaves your account

The assistant receives only the records a tool returns, for example one contact, one page of interactions, or one group. Calls go to `https://api.usebondery.com/mcp`, and only after you sign in and approve access.

Bondery never sends your full address book. The search tools require a search term and return at most 25 rows. Read only blocks every write.

See the [Bondery privacy policy](https://usebondery.com/privacy) for how your account data is handled. The [Terms of Service](https://usebondery.com/terms) cover your use of Bondery.

## Learn more

- [Connect AI assistants (MCP)](https://usebondery.com/docs/bondery/mcp)
- [MCP server overview](https://usebondery.com/docs/apps/mcp-server)

Licensed under AGPL-3.0. See [LICENSE](LICENSE).
