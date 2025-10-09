# Manually Triggering Product Previews

The `product.preview` tRPC procedure lets you fetch metadata (title, cached image, etc.) for any retailer URL without creating a watch. Use the steps below to exercise the endpoint from your local development environment.

## 1. Start the web application

Make sure the web app (which hosts the API route) is running:

```bash
pnpm --filter @pricedropp/web dev
```

Once it boots, the preview endpoint is available at <http://localhost:3000/api/trpc/product.preview>.

## 2. Issue the preview request

### macOS / Linux shells

`curl` on Unix-like systems supports line continuations with `\` and the `--data-urlencode` flag:

```bash
curl -G "http://localhost:3000/api/trpc/product.preview" \
  --data-urlencode 'batch=1' \
  --data-urlencode 'input={"0":{"json":{"url":"https://www.woolworths.co.nz/shop/productdetails?stockcode=281691&name=mainland-butter-salted"}}}'
```

### Windows PowerShell

PowerShell aliases `curl` to `Invoke-WebRequest`, which does not understand the Unix flags above. You have a couple of options:

#### Use the native curl binary

```powershell
curl.exe -G "http://localhost:3000/api/trpc/product.preview" `
  --data-urlencode 'batch=1' `
  --data-urlencode 'input={"0":{"json":{"url":"https://www.woolworths.co.nz/shop/productdetails?stockcode=281691`&name=mainland-butter-salted"}}}'
```

> **Tip:** PowerShell uses the backtick (\`) for line continuations. You can also write the command on a single line if you prefer.

The backtick before `&` inside the URL is required—without it, PowerShell interprets `&` as the background-job operator and launches `curl.exe` without the remaining arguments.

#### Or call Invoke-WebRequest directly

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/trpc/product.preview?batch=1&input={`"0`":{`"json`":{`"url`":`"https://www.woolworths.co.nz/shop/productdetails?stockcode=281691&name=mainland-butter-salted`"}}}"
```

Both variations return a JSON payload containing the product title and cached image metadata when the scrape succeeds.

## 3. Download the cached image (optional)

If the preview response includes an `image.id`, you can confirm the cached asset by downloading it locally:

```bash
curl "http://localhost:3000/api/images/<cached-asset-id>" --output preview.jpg
```

Replace `<cached-asset-id>` with the identifier returned in the preview response.

## Troubleshooting

* If you see a 500 error and the message mentions `CachedAsset`, run your Prisma migrations so the cache table exists.
* If the response omits `image`, the target page may not expose a suitable image tag. Try a different product URL to verify your setup.
