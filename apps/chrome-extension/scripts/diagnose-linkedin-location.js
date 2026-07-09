/**
 * LinkedIn profile location diagnostic — paste into DevTools on linkedin.com/in/<handle>
 *
 * Compares DOM topcard lines vs Voyager geo (embedded + GraphQL).
 * Share the printed JSON when reporting location scrape issues.
 */
(async () => {
  const handle = decodeURIComponent(location.pathname.match(/\/in\/([^/]+)/)?.[1] ?? "");
  const topcard = document.querySelector('[componentkey*="Topcard"]');
  const componentkey = topcard?.getAttribute("componentkey") ?? null;
  const urnMatch = componentkey?.match(/ref(ACo[A-Za-z0-9_-]+?)Topcard/);
  const profileUrn = urnMatch ? `urn:li:fsd_profile:${urnMatch[1]}` : null;

  const domLines = topcard
    ? [...topcard.querySelectorAll("p")].map((p) => ({
        inOrgLink: !!p.closest('a[href*="/company/"], a[href*="/school/"]'),
        linkHref: p.closest("a")?.href ?? null,
        text: p.textContent?.replace(/\s+/g, " ").trim(),
      }))
    : [];

  const blocks = [...document.querySelectorAll("code")]
    .map((c) => {
      const raw = c.innerHTML?.trim();
      if (!raw) {
        return null;
      }
      const m = raw.match(/^<!--(.+)-->$/s);
      try {
        return JSON.parse(m ? m[1] : raw);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const entities = [];
  for (const b of blocks) {
    if (Array.isArray(b.included)) {
      entities.push(...b.included);
    }
  }

  const profiles = entities.filter((e) => e.$type?.includes("identity.profile.Profile"));
  const geos = entities.filter((e) => e.$type?.includes("Geo"));

  const csrf = document.cookie.match(/JSESSIONID="?([^";]+)"?/)?.[1];
  const voyagerFetch = async (path) => {
    if (!csrf) {
      return { error: "no csrf" };
    }
    const r = await fetch(`https://www.linkedin.com${path}`, {
      credentials: "same-origin",
      headers: {
        accept: "application/vnd.linkedin.normalized+json+2.1",
        "csrf-token": csrf,
        "x-restli-protocol-version": "2.0.0",
      },
    });
    if (!r.ok) {
      return { error: r.status };
    }
    return r.json();
  };

  let graphqlUrn = null;
  let graphqlVanity = null;

  if (profileUrn) {
    const v = `(profileUrn:${encodeURIComponent(profileUrn)})`;
    graphqlUrn = await voyagerFetch(
      `/voyager/api/graphql?includeWebMetadata=true&variables=${v}&queryId=voyagerIdentityDashProfiles.7bab95a76318a84301169b923d563eb1`,
    );
  }
  if (handle) {
    const v = `(vanityName:${encodeURIComponent(handle)})`;
    graphqlVanity = await voyagerFetch(
      `/voyager/api/graphql?includeWebMetadata=true&variables=${v}&queryId=voyagerIdentityDashProfiles.34ead06db82a2cc9a778fac97f69ad6a`,
    );
  }

  const summarizeGeo = (geo) =>
    geo
      ? {
          countryISO: geo.countryISOCode,
          name: geo.defaultLocalizedName ?? geo.defaultLocalizedNameWithoutCountryName ?? geo.name,
          urn: geo.entityUrn,
        }
      : null;

  const report = {
    componentkey,
    domTopcardLines: domLines,
    embeddedGeoEntities: geos.slice(0, 15).map(summarizeGeo),
    embeddedProfileGeo: profiles.map((p) => ({
      geoLocation: p.geoLocation,
      publicIdentifier: p.publicIdentifier,
      urn: p.entityUrn,
    })),
    graphqlUrnGeos: graphqlUrn?.included
      ?.filter((e) => e.$type?.includes("Geo"))
      .slice(0, 10)
      .map(summarizeGeo),
    graphqlUrnProfiles: graphqlUrn?.included
      ?.filter((e) => e.$type?.includes("identity.profile.Profile"))
      .map((p) => ({ geoLocation: p.geoLocation, urn: p.entityUrn })),
    graphqlVanityGeos: graphqlVanity?.included
      ?.filter((e) => e.$type?.includes("Geo"))
      .slice(0, 10)
      .map(summarizeGeo),
    graphqlVanityProfiles: graphqlVanity?.included
      ?.filter((e) => e.$type?.includes("identity.profile.Profile"))
      .map((p) => ({ geoLocation: p.geoLocation, urn: p.entityUrn })),
    handle,
    profileUrn,
  };

  console.log("[bondery] LinkedIn location diagnostic");
  console.table(domLines);
  console.log(JSON.stringify(report, null, 2));
  return report;
})();
