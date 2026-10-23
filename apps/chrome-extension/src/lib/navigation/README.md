# Extension navigation

There is no in-app router. “Navigation” means open the **webapp** in a tab or window.

| Helper | Use |
|--------|-----|
| `hrefWebapp*` | Build absolute webapp URLs |
| `openWebapp*Tab` | `browser.tabs.create` (popup / background) |
| `openWebapp*Window` | `window.open` (content scripts) |

Product path shapes (`WEBAPP_ROUTES`, `routePersonWithNextAction`) stay in `@bondery/helpers`. This module only joins `config.appUrl` and opens the browser.
