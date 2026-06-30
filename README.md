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
INTERNAL_TOOLS_API_KEY=change-me-in-local-development
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
- Platform admin: `admin@platform.local`, password `admin123`
- Salon owner: `owner@salonana.local`, password `password123`
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
  "email": "admin@platform.local",
  "password": "admin123"
}
```

The MVP uses only two roles:

- `PLATFORM_ADMIN`: platform operator, `salonId` is `null`, can access `/admin/*`
- `SALON_OWNER`: salon user, `salonId` is required, can access salon dashboard routes

The same Expo login screen is used for both roles. The backend role in `/auth/me` decides access, and the Expo app chooses the navigator from `user.role`.

Platform admin routes require `Authorization: Bearer <accessToken>`:

```text
GET    /admin/overview
GET    /admin/salons
POST   /admin/salons
GET    /admin/salons/:id
PATCH  /admin/salons/:id
GET    /admin/salons/:id/features
PATCH  /admin/salons/:id/features/:featureKey
```

Dashboard routes require `Authorization: Bearer <accessToken>` and infer `salonId` from the JWT. Platform admins cannot access these routes:

```text
GET    /dashboard/salon
PATCH  /dashboard/salon

GET    /dashboard/salon-settings
PATCH  /dashboard/salon-settings

GET    /dashboard/today
GET    /dashboard/calls/recent
GET    /dashboard/features

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

POST   /tools/execute

POST   /conversation/start
POST   /conversation/:sessionId/message
POST   /conversation/:sessionId/end
```

Manual appointment creation finds or creates a customer by phone within the salon, snapshots customer/service/worker names, defaults `status` to `BOOKED`, defaults `channel` to `MANUAL`, and calculates `endAt` from the service duration when `endAt` is omitted.

Manual appointment creation now goes through the central Booking Engine, so dashboard bookings use the same working-hours, blocked-time, and appointment-conflict checks as future AI/Twilio/WhatsApp/Instagram channels.

## Feature Flags

Feature flags control which modules are available for each salon. They live in the backend, not only in the Expo UI, because hiding a button in the frontend is not enough to protect provider costs, channel access, or booking rules.

Supported feature keys:

- `MANUAL_BOOKING`
- `AI_RECEPTIONIST`
- `VOICE`
- `SMS`
- `WHATSAPP`
- `INSTAGRAM`
- `REMINDERS`
- `CALL_RECORDING`
- `CALL_TRANSCRIPTS`
- `ANALYTICS`

New salons get default feature records:

```text
MANUAL_BOOKING=true
AI_RECEPTIONIST=false
VOICE=false
SMS=false
WHATSAPP=false
INSTAGRAM=false
REMINDERS=false
CALL_RECORDING=false
CALL_TRANSCRIPTS=false
ANALYTICS=false
```

The seed enables Salon Ana for the MVP voice/SMS demo path:

```text
MANUAL_BOOKING=true
AI_RECEPTIONIST=true
VOICE=true
SMS=true
CALL_RECORDING=true
CALL_TRANSCRIPTS=true
WHATSAPP=false
INSTAGRAM=false
REMINDERS=false
ANALYTICS=false
```

Platform admins manage flags from the salon details screen. The app calls `GET /admin/salons/:id/features` to load the list and `PATCH /admin/salons/:id/features/:featureKey` with `{ "enabled": true }` or `{ "enabled": false }` to update one module.

Salon owners can read their modules through `GET /dashboard/features` and see them in Settings, but they cannot update flags.

Backend enforcement starts with dashboard manual booking. The `dashboard/booking` routes call `FeatureFlagsService.requireFeature(salonId, MANUAL_BOOKING)` and return `FEATURE_DISABLED` if the module is off. Future Twilio voice, SMS, WhatsApp, Instagram, reminders, call recording, transcripts, and analytics flows should call the same service before running provider-specific logic.

## Tool Layer

The Tool Layer is the safe API boundary for future AI agents and communication channels. AI should not query Prisma models or database tables directly. It should call approved tools, which then call the Booking Engine and business services.

Flow:

```text
Communication Channel
Conversation Engine
API Tool Layer
Booking Engine / Business Services
Database
```

The internal endpoint is:

```text
POST /tools/execute
```

It is protected with `x-internal-tools-key`, which must match `INTERNAL_TOOLS_API_KEY`.

Available tool names:

- `getSalonContext`
- `findAvailableSlots`
- `bookAppointment`
- `cancelAppointment`
- `rescheduleAppointment`
- `findCustomer`
- `findUpcomingAppointmentsForCustomer`
- `transferCall`
- `logConversationEvent`

Example request:

```bash
curl -X POST http://localhost:4000/tools/execute \
  -H "Content-Type: application/json" \
  -H "x-internal-tools-key: change-me-in-local-development" \
  -d "{\"toolName\":\"findAvailableSlots\",\"context\":{\"salonId\":\"SALON_ID\",\"channel\":\"PHONE\",\"conversationId\":\"call-123\",\"customerPhone\":\"+381641234567\"},\"input\":{\"serviceId\":\"SERVICE_ID\",\"date\":\"2026-06-26\",\"limit\":3}}"
```

Successful tool response:

```json
{
  "ok": true,
  "data": {}
}
```

Failed tool response:

```json
{
  "ok": false,
  "error": {
    "code": "SLOT_CONFLICT",
    "message": "Slot is already booked.",
    "details": {}
  }
}
```

When the AI needs the caller to choose between possible appointments, tools return `NEEDS_CLARIFICATION` with `details.options`.

Every tool execution is written to `tool_execution_logs` with salon, channel, tool name, input, output for successful calls, success flag, and error code/message for failures. Do not send secrets in tool inputs.

Feature flags are enforced inside the Tool Layer:

- `MANUAL` booking tools require `MANUAL_BOOKING`
- `PHONE` tools require `AI_RECEPTIONIST` for booking actions and `VOICE` for the channel
- `WHATSAPP` tools require `AI_RECEPTIONIST` and `WHATSAPP`
- `INSTAGRAM` tools require `AI_RECEPTIONIST` and `INSTAGRAM`
- `WEB_CHAT` booking tools require `AI_RECEPTIONIST`
- `transferCall` returns a transfer decision and number only; it does not perform a Twilio transfer yet

## Conversation Engine

The Conversation Engine is the backend state machine that future Twilio Voice, WhatsApp, Instagram DM, and web chat adapters will use. It accepts channel messages, stores conversation sessions and messages, calls the Tool Layer for actions, and returns the next assistant message plus optional actions such as `TRANSFER_CALL`.

The internal endpoints are:

```text
POST /conversation/start
POST /conversation/:sessionId/message
POST /conversation/:sessionId/end
```

They are protected with `x-internal-tools-key`, which must match `INTERNAL_TOOLS_API_KEY`.

Full maintenance docs live in [docs/conversation-engine.md](docs/conversation-engine.md).

OpenAI Realtime, Twilio live audio, WhatsApp provider, Instagram provider, SMS provider, and production call transfer are intentionally not implemented yet.

## Twilio Voice

Twilio Voice webhooks are available for local MVP testing:

```text
POST /webhooks/twilio/voice
POST /webhooks/twilio/gather
POST /webhooks/twilio/status
```

The Twilio adapter identifies the salon by `salon.twilioPhoneNumber`, starts a `PHONE` Conversation Engine session, returns TwiML `<Gather>` responses, logs calls to `call_logs`, and updates dashboard call history.

Exact Twilio account setup, ngrok testing, webhook URLs, and common fixes are documented in [docs/twilio-setup.md](docs/twilio-setup.md).

Quick login test:

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@platform.local\",\"password\":\"admin123\"}"
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

The app opens on one login screen. It stores the JWT with `expo-secure-store`, calls `/auth/me`, then routes by role:

- `PLATFORM_ADMIN` sees the Platform Admin dashboard
- `SALON_OWNER` sees the Salon dashboard

## Localization

The Expo app is Serbian-first. The default language is Serbian (`sr`), with English (`en`) available as a secondary language from Settings.

Translation files live in:

```text
apps/mobile/src/i18n/index.tsx
apps/mobile/src/i18n/translations.ts
apps/mobile/src/i18n/locales/sr.ts
apps/mobile/src/i18n/locales/en.ts
```

Use `t('some.key')` for user-facing text, and add every new key to both `sr.ts` and `en.ts`. The English file is typed against the Serbian file, so missing keys are caught during TypeScript checks.

Language switching is available in both salon owner Settings and Platform Admin Settings under the app language section. The selected language updates the UI immediately and is persisted locally with `expo-secure-store` on native platforms, or `localStorage` on web, using the key `ai-salon-language`.

Backend enum values stay in English (`BOOKED`, `CANCELLED`, `MANUAL`, `PHONE`, and similar). Only the labels shown in the mobile app are translated through the i18n helpers.

For local API connections:

- Expo web can use `EXPO_PUBLIC_API_BASE_URL=http://localhost:4000`
- Physical devices should use your computer LAN IP, for example `http://192.168.1.20:4000`
- ngrok can be used by setting `EXPO_PUBLIC_API_BASE_URL` to the ngrok URL

Run Expo web directly:

```bash
npm run web
```

## Dashboard Screens

After login, the salon owner lands in a mobile-first SaaS dashboard with bottom tabs. In Serbian by default, these are:

- Danas
- Kalendar
- Dodaj
- Klijenti
- Podešavanja

The app also has stack screens for:

- Detalji termina
- Usluge
- Frizeri
- Radno vreme
- Blokirano vreme

The Today screen is the main product surface. It shows the salon header, AI status, next appointment, today stats, quick actions, the appointment timeline, and a recent calls preview.

The Add tab contains the manual booking flow powered by the central Booking Engine. Services, Workers, Working Hours, and Blocked Time are accessible from Settings.

## Platform Admin Screens

After login, the platform admin lands in a separate bottom-tab navigator inside the same Expo app. In Serbian by default, these are:

- Pregled
- Saloni
- Kreiraj
- Podešavanja

Platform admin can view platform totals, search/filter salons, open salon details, update basic salon and receptionist settings, manage salon feature flags, create salons with a first `SALON_OWNER`, and log out. Impersonation, payments, Twilio, OpenAI Realtime, WhatsApp, Instagram, SMS sending, charts, and password reset are intentionally not implemented here.

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
