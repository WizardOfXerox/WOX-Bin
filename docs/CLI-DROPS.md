# CLI drops: termbin-style text and 0x0-style file uploads

WOX-Bin now ships a small anonymous drop surface for command-line use.

## Termbin-style text upload

### Upload text from stdin

```bash
cat some_file.txt | curl --data-binary @- https://your-app.example/api/public/termbin
```

### Options

- `?expires=24` sets expiry in hours
- `?burn=1` deletes the text after the first successful read

Example:

```bash
echo "hello" | curl --data-binary @- "https://your-app.example/api/public/termbin?expires=24&burn=1"
```

The response is a plain-text URL under ` /t/[slug] `.

## 0x0-style file upload

### Upload a local file

```bash
curl -F "file=@yourfile.png" https://your-app.example/api/public/upload
```

### Copy from a remote URL

```bash
curl -F "url=https://example.com/image.jpg" https://your-app.example/api/public/upload
```

### Optional fields

- `secret` — generates a longer, harder-to-guess URL
- `expires` — hours from now, or milliseconds since UNIX epoch

Example:

```bash
curl -F "file=@yourfile.png" -F "secret=" -F "expires=24" https://your-app.example/api/public/upload
```

The response body is the file URL under ` /x/[slug]/[filename] `. The upload response also includes an `X-Token` header.

## Management token

Use the `X-Token` response header to manage uploaded files.

### Delete immediately

```bash
curl -F "token=TOKEN_HERE" -F "delete=" https://your-app.example/x/slug/file.png
```

### Update expiry

```bash
curl -F "token=TOKEN_HERE" -F "expires=72" https://your-app.example/x/slug/file.png
```

## Current limits

- Text uploads: 512 KiB max
- File uploads: 4 MiB max
- Remote URL uploads must provide `Content-Length`
- Remote URL uploads reject localhost/private-network targets

## Why the limits are smaller than public hosts like 0x0.st

This implementation is designed to be safe on the current Vercel + Postgres deployment. It is not intended to be a large public artifact host. If you want bigger anonymous file hosting, move the binary payload path to object storage first.
