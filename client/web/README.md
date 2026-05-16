# Better SMS — Web Dashboard

Next.js admin dashboard for the Better SMS school management system.

## Prerequisites

- Node.js 20+
- The [Better SMS API server](../../server/README.md) running (default port `8000`)

## Configuration

Copy the example env file and set the API server URL:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the Better SMS API server | `http://localhost:8000` |

If the server is running on a different host or port, update `NEXT_PUBLIC_API_URL` accordingly.

## Development

```bash
npm install
npm run dev
```

Dashboard is available at [http://localhost:3000](http://localhost:3000).

## Docker

Build and run with Docker Compose (copies env from `.env.local`):

```bash
cp .env.example .env.local
# edit .env.local if needed
docker compose up --build
```

To point the container at an API server on the host machine, set:

```
NEXT_PUBLIC_API_URL=http://host.docker.internal:8000
```

## Project Structure

```
app/          Next.js app router pages
components/   Shared UI components
hooks/        Custom React hooks
lib/api/      API client modules (one file per resource)
store/        Zustand auth store
types/        TypeScript type definitions
constants/    Nav config, role definitions
```
