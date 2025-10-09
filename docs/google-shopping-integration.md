# Google Shopping integration notes

We surface Google Shopping previews in the "Add watch" dialog and on the dashboard
by scraping the public shopping search page that a browser would render. There is
no publicly documented Google API that returns those listings for arbitrary queries.

## Why we cannot use the "Google Shopping API"

Google's documentation mentions a **Content API for Shopping**, sometimes referred
to informally as the "Google Shopping API". That product is designed for merchants
who upload their own catalog to Google Merchant Center. It does **not** expose the
consumer shopping search index. In particular:

- You need a verified Merchant Center account tied to your store.
- Requests are authenticated with OAuth2 and limited to managing your own items.
- The API responses only contain the products you have uploaded; it cannot search
  across other retailers or public listings.

Because of those constraints the Content API cannot power the discovery previews we
show in PriceDropp—our users expect to see third-party listings from across the web.

## Supported approaches in PriceDropp

We currently support two ways to populate previews:

1. **Direct scraping (default):** We download the standard `tbm=shop` results page
   and extract product cards and embedded `AF_initDataCallback` payloads. This works
   without any external dependencies but is sensitive to Google markup changes.
2. **SerpApi fallback (optional):** If you set `SERPAPI_KEY` in the environment we
   query the SerpApi Shopping endpoint first. SerpApi maintains the scraping layer
   and returns normalized data, which helps when Google blocks automated requests.

If you want to avoid scraping entirely you would need to bring your own maintained
proxy or licensed data source. At the moment Google does not offer an official API
that can be used as a drop-in replacement for consumer Google Shopping search.
