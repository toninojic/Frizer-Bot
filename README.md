# AI Salon Receptionist

MVP foundation for an AI receptionist booking system for small hair salons.

The architecture starts with a central backend Booking Engine. Future channels such as Twilio phone calls, WhatsApp, Instagram DM, and manual dashboard actions should call the same backend booking logic instead of owning separate booking flows.

## Structure

```text
apps/
  api/       NestJS API
  mobile/    Expo React Native app
packages/
  shared/    Shared TypeScript types
```

## Prerequisites

- Node.js 22.13+ recommended for the current Expo/React Native toolchain
- npm
- Docker Desktop

On Windows PowerShell, if `npm` is blocked by execution policy, use `npm.cmd`.

## Environment

Backend variables live in `apps/api/.env`.

```bash
cp apps/api/.env.example apps/api/.env
# PowerShell: Copy-Item apps/api/.env.example apps/api/.env
```

The default local database URL is:

```text
postgresql://postgres:postgres@localhost:5432/salon_ai?schema=public
```

JWT auth also needs:

```text
JWT_SECRET=change-me-in-local-development
JWT_EXPIRES_IN=7d
```

The mobile app can optionally use `apps/mobile/.env`:

```bash
cp apps/mobile/.env.example apps/mobile/.env
# PowerShell: Copy-Item apps/mobile/.env.example apps/mobile/.env
```

For Expo on a physical device, replace `localhost` with your computer's LAN IP address.

## Install

```bash
npm install
```

## Start PostgreSQL

```bash
npm run docker:up
```

This starts Postgres with:

```text
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=salon_ai
```

## Prisma

Generate Prisma Client:

```bash
npm run db:generate
```

Run migrations:

```bash
npm run db:migrate
```

Seed the demo salon:

```bash
npm run db:seed
```

The schema lives at `apps/api/prisma/schema.prisma`, and migrations are in `apps/api/prisma/migrations`.

## Demo Data

The seed creates:

- Salon: `Salon Ana`, phone `+381641112223`, timezone `Europe/Belgrade`
- Owner user: `owner@salonana.local`, password `password123`
- Receptionist settings: `Mila`, enabled, Serbian welcome message, SMS confirmations enabled, reminders 2 hours before
- Workers: `Ana`, `Marija`
- Services: `Šišanje` 30 min, `Feniranje` 20 min, `Šišanje i pranje` 45 min, `Farbanje` 120 min
- Working hours: Monday-Friday `09:00-18:00`, Saturday `09:00-14:00`, Sunday closed

## API Endpoints

Auth endpoints:

```text
POST   /auth/login
GET    /auth/me
```

Demo login body:

```json
{
  "email": "owner@salonana.local",
  "password": "password123"
}
```

Dashboard routes require `Authorization: Bearer <accessToken>` and infer `salonId` from the JWT:

```text
GET    /dashboard/salon
PATCH  /dashboard/salon

GET    /dashboard/salon-settings
PATCH  /dashboard/salon-settings

GET    /dashboard/workers
POST   /dashboard/workers
PATCH  /dashboard/workers/:id
DELETE /dashboard/workers/:id

GET    /dashboard/services
POST   /dashboard/services
PATCH  /dashboard/services/:id
DELETE /dashboard/services/:id

GET    /dashboard/working-hours
PUT    /dashboard/working-hours

GET    /dashboard/customers
POST   /dashboard/customers
PATCH  /dashboard/customers/:id

GET    /dashboard/appointments
POST   /dashboard/appointments
PATCH  /dashboard/appointments/:id/cancel
```

Manual appointment creation finds or creates a customer by phone within the salon, snapshots customer/service/worker names, defaults `status` to `BOOKED`, defaults `channel` to `MANUAL`, and calculates `endAt` from the service duration when `endAt` is omitted.

Quick login test:

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"owner@salonana.local\",\"password\":\"password123\"}"
```

## Start Backend

```bash
npm run dev:api
```

Health check:

```bash
curl http://localhost:4000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "ai-salon-receptionist-api"
}
```

## Start Expo

```bash
npm run dev:mobile
```

The app opens on the login screen. It stores the JWT with `expo-secure-store`, calls `/auth/me`, then loads the salon dashboard shell.

For local API connections:

- Expo web can use `EXPO_PUBLIC_API_BASE_URL=http://localhost:4000`
- Physical devices should use your computer LAN IP, for example `http://192.168.1.20:4000`
- ngrok can be used by setting `EXPO_PUBLIC_API_BASE_URL` to the ngrok URL

## Run Everything

In separate terminals:

```bash
npm run docker:up
npm run dev:api
npm run dev:mobile
```

Or start API and mobile together after Postgres is running:

```bash
npm run dev
```

## Docker API Service

The Compose file includes an optional API service profile:

```bash
docker compose --profile api up --build
```

For day-to-day development, running Postgres in Docker and the API locally is simpler.

## Webhooks

`PUBLIC_WEBHOOK_BASE_URL` is already part of the backend environment. Later, ngrok can provide this URL for Twilio webhook testing without changing the backend config shape.

AI, Twilio, WhatsApp, Instagram, payments, conflict detection, slot finding, and production deployment are intentionally not implemented in this phase.
