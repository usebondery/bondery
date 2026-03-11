---
icon: puzzle-piece
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

## Enriching an existing contact

If a contact already exists in Bondery and has a LinkedIn handle set, you can refresh their profile data at any time without visiting LinkedIn manually.

1. Open the contact's page in Bondery.
2. Click **Enrich from LinkedIn** (available in the contact action menu on the People page, or from the contact's LinkedIn tab).
3. The extension opens the LinkedIn profile in the background, scrapes the latest data, and updates the contact automatically.
4. A notification confirms when enrichment is complete.

{% hint style="info" %}
Enrichment requires the extension to be installed and you to be signed in to LinkedIn in your browser.
{% endhint %}

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
