# Import from data exports

Bondery can bulk-import contacts directly from your LinkedIn or Instagram data export. The importer reads the ZIP file you download from those platforms, shows you a preview, and then writes the contacts to your account.

Both imports are available at **Settings → Data management**.

## LinkedIn import

### Get your data export

1. Go to **LinkedIn → Settings → Data privacy → Get a copy of your data**
2. Select **Connections** (you do not need the full archive)
3. Wait for the email from LinkedIn and download the ZIP file

### What gets imported

The importer reads `Connections.csv` inside the ZIP. Each row maps to a Bondery contact:

| LinkedIn field | Bondery field |
|---|---|
| First Name | First name |
| Last Name | Last name |
| URL | LinkedIn handle |
| Email Address | Email |
| Position + Company | Headline (e.g. `Software Engineer @Acme`) |
| Connected On | Stored as the connection date |

Middle names and name titles (e.g. "Dr.") are handled automatically.

### Importing

1. Upload the ZIP (or the extracted `Connections.csv`) in the import dialog
2. Review the **preview** — Bondery shows how many contacts are valid, invalid, and already in your account
3. Deselect any contacts you do not want to import
4. Click **Import**

After the import you will see three counts:

- **Imported** — new contacts created
- **Updated** — existing contacts that were matched by LinkedIn handle and had data refreshed
- **Skipped** — rows that were invalid or exact duplicates already in your account

All imported contacts are added to a dedicated **LinkedIn import** group so you can find them easily.

---

## Instagram import

### Get your data export

1. Go to **Instagram → Settings → Your activity → Download your information**
2. Request a **JSON** format download (not HTML)
3. Wait for the notification and download the ZIP file

### Import strategies

When you start the import you choose which part of your Instagram network to bring in:

| Strategy | What it includes |
|---|---|
| Following & followers *(default)* | Everyone you follow and everyone who follows you |
| Mutual following | Only accounts that follow you back |
| Following | Only accounts you follow |
| Followers | Only accounts that follow you |
| Close friends | Your close friends list |

### Contact classification

Instagram usernames do not come with a real name. Bondery analyzes each username and classifies accounts into:

- **Likely person** — the username does not contain brand/organization signals; these are imported as contacts
- **Likely influencer or brand** — the username contains known brand tokens (e.g. "nike", "official", "news", "academy"); these are flagged so you can review before importing

You can review the classification in the preview step and change individual entries before committing.

### Importing

1. Upload the ZIP in the import dialog
2. Choose your strategy
3. Review the preview, adjust classifications if needed
4. Click **Import**

The same **Imported / Updated / Skipped** counts are shown after the import. All imported contacts are added to a dedicated **Instagram import** group.

---

## Chrome Extension import

In addition to data exports, you can also import contacts one by one while browsing LinkedIn or Instagram directly in your browser. See the [Chrome Extension](../bondery/chrome-extension.md) page for details.
