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

GET    /dashboard/today
GET    /dashboard/calls/recent

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

GET    /dashboard/time-blocks
POST   /dashboard/time-blocks
DELETE /dashboard/time-blocks/:id

GET    /dashboard/customers
GET    /dashboard/customers?search=marko
GET    /dashboard/customers/:id
POST   /dashboard/customers
PATCH  /dashboard/customers/:id

GET    /dashboard/appointments
GET    /dashboard/appointments?date=2026-06-26
GET    /dashboard/appointments?from=2026-06-26&to=2026-06-30
GET    /dashboard/appointments/:id
POST   /dashboard/appointments
PATCH  /dashboard/appointments/:id/cancel

GET    /dashboard/booking/available-slots
POST   /dashboard/booking/book
POST   /dashboard/booking/cancel
POST   /dashboard/booking/reschedule

POST   /booking/available-slots
POST   /booking/book
POST   /booking/cancel
POST   /booking/reschedule
```

Manual appointment creation finds or creates a customer by phone within the salon, snapshots customer/service/worker names, defaults `status` to `BOOKED`, defaults `channel` to `MANUAL`, and calculates `endAt` from the service duration when `endAt` is omitted.

Manual appointment creation now goes through the central Booking Engine, so dashboard bookings use the same working-hours, blocked-time, and appointment-conflict checks as future AI/Twilio/WhatsApp/Instagram channels.

Quick login test:

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"owner@salonana.local\",\"password\":\"password123\"}"
```

## Start Backend

```bash
npm run api:dev
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
npm run start
```

The app opens on the login screen. It stores the JWT with `expo-secure-store`, calls `/auth/me`, then loads the salon dashboard shell.

For local API connections:

- Expo web can use `EXPO_PUBLIC_API_BASE_URL=http://localhost:4000`
- Physical devices should use your computer LAN IP, for example `http://192.168.1.20:4000`
- ngrok can be used by setting `EXPO_PUBLIC_API_BASE_URL` to the ngrok URL

Run Expo web directly:

```bash
npm run web
```

## Dashboard Screens

After login, the salon owner lands in a mobile-first SaaS dashboard with bottom tabs:

- Today
- Calendar
- Add
- Clients
- Settings

The app also has stack screens for:

- Appointment Details
- Services
- Workers
- Working Hours
- Blocked Time

The Today screen is the main product surface. It shows the salon header, AI status, next appointment, today stats, quick actions, the appointment timeline, and a recent calls preview.

The Add tab contains the manual booking flow powered by the central Booking Engine. Services, Workers, Working Hours, and Blocked Time are accessible from Settings.

## Mobile Design System

The Expo app has centralized design tokens in `apps/mobile/src/theme`:

- pastel colors
- spacing scale `4, 8, 12, 16, 20, 24, 32`
- typography sizes
- soft card radius and shadows

Reusable UI components live in `apps/mobile/src/components`, including `AppScreen`, `AppHeader`, `Card`, `Button`, `IconButton`, `StatusBadge`, `EmptyState`, `LoadingState`, `ErrorState`, `SectionHeader`, `AppointmentCard`, `QuickActionCard`, `StatCard`, `FormInput`, `SelectCard`, `TimeSlotCard`, and `ToggleSwitch`.

## Managing Workers

The Workers screen lists active workers first and keeps inactive workers visible so they can be reactivated. The owner can add a worker, edit the worker name, deactivate a worker, or reactivate a worker.

Worker delete actions are soft deletes. The API sets `isActive=false` instead of removing the row, so historical appointments and future audit data can still reference the worker.

## Managing Services

The Services screen lets the owner add, edit, deactivate, and reactivate services. Each service has:

- name
- duration in minutes
- optional positive price
- active/inactive status

Service durations are required because future slot finding will use them to calculate appointment end times and available openings.

## Working Hours

The Working Hours screen stores opening hours for Monday through Sunday. Each day can be marked closed, or configured with `HH:mm` open and close times.

Future Booking Engine logic will use these weekly hours as the salon's baseline availability before checking appointments and time blocks.

## Blocked Time

The Blocked Time screen stores upcoming unavailable periods. A block can apply to the whole salon or to one worker.

Examples include breaks, vacations, holidays, private appointments, and manual blocked time. Future Booking Engine logic will use these records to remove unavailable intervals from bookable slots.

## Booking Engine

The central Booking Engine lives in the NestJS API and owns booking rules for every channel. Expo dashboard screens, future Twilio calls, WhatsApp, Instagram DM, and web booking should call this engine instead of implementing their own availability logic.

It currently handles:

- finding available slots with 10 minute granularity
- salon timezone and weekly working hours
- closed days
- active worker and active service validation
- existing booked appointment conflicts
- worker-specific and whole-salon time blocks
- past-slot rejection
- safe manual booking with customer upsert and snapshots
- safe cancellation without deleting appointments
- safe rescheduling while ignoring the appointment being moved

Protected dashboard routes infer `salonId` from the JWT. The `/booking/*` routes currently require an explicit `salonId` in the request body so future channels can be wired in later with channel-specific auth.

Available slots example:

```json
{
  "serviceId": "...",
  "workerId": "...",
  "date": "2026-06-26",
  "limit": 3
}
```

Booking example:

```json
{
  "workerId": "...",
  "serviceId": "...",
  "customerName": "Marko",
  "customerPhone": "+381641234567",
  "startAt": "2026-06-26T14:30:00.000Z",
  "channel": "MANUAL"
}
```

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

AI, Twilio, WhatsApp, Instagram, payments, and production deployment are intentionally not implemented in this phase.
