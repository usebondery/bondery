---
icon: puzzle-piece
docId: bondery.chrome-extension
docSections:
  enriching-contact: enriching-contact
---

# Chrome Extension

The Bondery Chrome Extension lets you save and enrich contacts directly from LinkedIn and Instagram. No copying, no pasting, no manual data entry.

## What it does

| Feature | Description |
|---|---|
| Save from LinkedIn | Visit any LinkedIn profile and add the person to Bondery with one click. Name, headline, location, photo, work history, and education are captured automatically. |
| Save from Instagram | Visit any Instagram profile and save the person as a contact instantly. |
| Enrich existing contacts | From the Bondery webapp, trigger a background refresh for any contact that has a LinkedIn handle. The extension fetches the latest profile data and updates the contact silently. |
| Auto-grouping | Contacts added via the extension are automatically placed in a dedicated group — "LinkedIn: Extension Import" or "Instagram: Extension Import" — so you can find them easily. |

## How to install

1. Go to the [Bondery Extension on the Chrome Web Store](https://chromewebstore.google.com/detail/lpcmokfekjjejnpobhbkgmjkodfhpmha).
2. Click **Add to Chrome**.
3. Once installed, click the extension icon in your toolbar and sign in with your Bondery account.

The extension works in Chrome and any Chromium-based browser (Edge, Brave, Arc, etc.).

## Saving a contact from LinkedIn

1. Open any LinkedIn profile page (e.g. `linkedin.com/in/username`).
2. An **Add to Bondery** button appears near the profile action buttons.
3. Click it. The extension scrapes the profile — name, headline, location, photo, work history, and education — and sends it to Bondery.
4. A confirmation appears. If the person is already in your contacts, their record is updated instead of duplicated.

{% hint style="info" %}
Work history and education are fetched in full, even when LinkedIn truncates them on the page.
{% endhint %}

## Saving a contact from Instagram

1. Open any Instagram profile page (e.g. `instagram.com/username`).
2. An **Add to Bondery** button appears on the profile.
3. Click it. The person is added to Bondery with their Instagram username and display name.

## Enriching an existing contact {#enriching-contact}

### What enrichment means

**Enrichment** fills in or refreshes a contact's LinkedIn profile details inside Bondery — without you copying fields by hand or leaving the app.

Think of it as asking Bondery to visit the person's LinkedIn profile for you, read what's there, and write the useful parts back to the contact record.

### When to use it

Enrichment is helpful when a contact **already exists** in Bondery and has a **LinkedIn handle** set, but the profile details are missing, incomplete, or out of date. Common situations:

* You added someone manually with only a name and LinkedIn URL.
* You imported a contact from a vCard, CSV, or another source that did not include work history or education.
* The person changed jobs, moved, or updated their headline on LinkedIn since you last saved them.
* You are preparing for a meeting and want their current role, company, and bio in one place.

Enrichment is **not** for creating a brand-new contact from LinkedIn — use **Add to Bondery** on the LinkedIn profile page for that. Enrichment updates contacts you already have.

### What gets updated

After enrichment completes, Bondery updates fields such as:

| Area | Examples |
|---|---|
| Profile summary | Headline, location, profile photo, LinkedIn bio |
| Work history | Job titles, companies, dates — including entries LinkedIn truncates on the page |
| Education | Schools, degrees, dates |

Your notes, tags, groups, relationships, and interactions are **not** overwritten. Enrichment only refreshes LinkedIn-sourced profile data.

### Why it helps

* **Less manual work** — no tab-switching to copy headline, employer, or school names.
* **Richer contact records** — work and education timelines make search, filtering, and context before calls much easier.
* **Stays current** — run enrichment again any time someone's LinkedIn profile changes.
* **Runs in the background** — you can keep working in Bondery while the extension fetches data.

### How it works (step by step)

1. Open the contact in Bondery (or select contacts on the **Fix & Merge** page for batch enrichment).
2. Click **Enrich** or **Enrich from LinkedIn** — on the contact page recommendation card, in the contact action menu on the People page, or from the LinkedIn tab.
3. Bondery asks the Chrome Extension to open that person's LinkedIn profile in a **background tab**.
4. The extension reads the latest profile data and sends it to Bondery.
5. The contact page updates automatically. A notification confirms when enrichment is finished.

You do not need to interact with the LinkedIn tab. If enrichment is interrupted, you can resume from where you left off.

{% hint style="info" %}
Enrichment requires the [Chrome Extension](#how-to-install) to be installed, you to be signed in to Bondery in the extension, and you to be signed in to LinkedIn in the **same browser profile**.
{% endhint %}

### Where to find it in the app

| Location | What you see |
|---|---|
| Contact page | A recommendation card when the contact has LinkedIn but has never been enriched |
| People page | **Enrich from LinkedIn** in a contact's action menu |
| Contact → LinkedIn tab | Enrich action alongside imported LinkedIn data |
| Fix & Merge | Batch **Enrich all** for every contact that still needs enrichment |

## Requirements

* Google Chrome or any Chromium-based browser (Edge, Brave, Arc, etc.)
* A Bondery account
* Signed in to LinkedIn or Instagram in the same browser

## Troubleshooting

**The "Add to Bondery" button does not appear.**
Reload the profile page. On LinkedIn, the button may take a moment to appear after the page renders. If the problem persists, check that the extension is enabled in `chrome://extensions`.

**Enrichment fails or shows an error.**
Make sure you are signed in to LinkedIn in the same browser window. If you are using multiple profiles in Chrome, ensure the extension runs in the same profile as your LinkedIn session.

**The extension asks me to sign in again.**
Your session may have expired. Click the extension icon and sign in with your Bondery account again.
