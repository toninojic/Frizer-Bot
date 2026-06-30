# Twilio Voice Setup

This document explains how to connect a Twilio Voice phone number to the AI Salon Receptionist backend.

This phase uses classic Twilio Voice webhooks and TwiML. It does not implement OpenAI Realtime, live audio streaming, WhatsApp, Instagram, SMS sending, payments, or production-grade AI voice.

Official Twilio references:

- [Phone Numbers](https://www.twilio.com/docs/phone-numbers)
- [TwiML Gather](https://www.twilio.com/docs/voice/twiml/gather)
- [Calls resource and status callbacks](https://www.twilio.com/docs/voice/api/call-resource)
- [Webhook signature validation](https://www.twilio.com/docs/usage/webhooks/webhooks-security)

## What You Need

You need a Twilio account with Programmable Voice enabled and at least one Twilio phone number that supports Voice.

For the MVP:

- Calls go directly to the Twilio number.
- Twilio sends HTTP POST webhooks to this backend.
- The backend starts a Conversation Engine session.
- Twilio speaks the assistant response and collects speech or keypad input using `<Gather>`.

## Environment Variables

Backend env vars live in `apps/api/.env`.

```text
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_VALIDATE_SIGNATURE=false
PUBLIC_WEBHOOK_BASE_URL=
```

Local example with ngrok:

```text
PUBLIC_WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok-free.app
TWILIO_VALIDATE_SIGNATURE=false
```

Production recommendation:

```text
TWILIO_VALIDATE_SIGNATURE=true
```

Keep `TWILIO_AUTH_TOKEN` secret. Do not commit real values.

## Find Twilio Credentials

In Twilio Console:

1. Open the Twilio Console home page.
2. Copy `Account SID`.
3. Copy `Auth Token`.
4. Open Phone Numbers and copy the Twilio number in E.164 format, for example `+14155550123`.

Set:

```text
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+14155550123
```

## Buy Or Configure A Twilio Number

1. In Twilio Console, open Phone Numbers.
2. Buy a number that supports Voice.
3. Open the number details page.
4. In the Voice configuration section, configure the incoming call webhook.

Use:

```text
Voice webhook URL: https://your-domain.com/webhooks/twilio/voice
HTTP method: POST
```

For local development with ngrok:

```text
Voice webhook URL: https://your-ngrok-url.ngrok-free.app/webhooks/twilio/voice
HTTP method: POST
```

Configure status callback:

```text
Status callback URL: https://your-domain.com/webhooks/twilio/status
HTTP method: POST
```

For local development:

```text
Status callback URL: https://your-ngrok-url.ngrok-free.app/webhooks/twilio/status
HTTP method: POST
```

The gather callback is returned in TwiML by the backend:

```text
https://your-domain.com/webhooks/twilio/gather
```

## Local Testing With ngrok

Start Postgres:

```bash
npm run docker:up
```

Apply migrations:

```bash
npm --workspace @ai-salon/api exec prisma migrate deploy
```

Seed demo data if needed:

```bash
npm run db:seed
```

Start the API:

```bash
npm run dev:api
```

Start ngrok:

```bash
ngrok http 4000
```

Copy the HTTPS forwarding URL from ngrok and set:

```text
PUBLIC_WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok-free.app
```

Restart the API after changing `.env`.

Update the Twilio phone number Voice webhook and Status callback to use the same ngrok base URL.

## Map Twilio Numbers To Salons

The backend identifies the salon by:

```text
salon.twilioPhoneNumber == Twilio To field
```

The Twilio number must be stored on the salon in E.164 format, for example:

```text
+14155550123
```

For local MVP fallback only: if no salon matches `To` and there is exactly one active salon, the backend uses that salon. This makes first local testing easier, but production must always set `twilioPhoneNumber`.

Platform Admin can store the Twilio phone number on the salon details screen. The seed also copies `TWILIO_PHONE_NUMBER` into the demo salon when `npm run db:seed` is run.

## Feature And Salon Checks

Before a call enters the Conversation Engine, the backend checks:

- `salon.isActive`
- `VOICE` feature flag
- `AI_RECEPTIONIST` feature flag
- `salon.receptionistEnabled`
- working hours in the salon timezone

If the salon is closed and `workingAfterHoursEnabled` is false, the call is politely ended. If `workingAfterHoursEnabled` is true, the receptionist can answer outside working hours.

If AI is disabled but `transferPhone` exists, the backend returns TwiML `<Dial>` and transfers the caller to the salon.

## Test The First Call

1. Confirm Postgres is running.
2. Confirm migrations are applied.
3. Confirm API is running on port `4000`.
4. Confirm ngrok is forwarding to `http://localhost:4000`.
5. Confirm `PUBLIC_WEBHOOK_BASE_URL` matches the current ngrok HTTPS URL.
6. Confirm the Twilio number has:
   - Voice webhook: `/webhooks/twilio/voice`
   - Status callback: `/webhooks/twilio/status`
   - Both set to POST
7. Confirm the salon has `twilioPhoneNumber` set to the Twilio number.
8. Confirm salon features `VOICE` and `AI_RECEPTIONIST` are enabled.
9. Call the Twilio number.
10. Check the API logs.
11. Check dashboard call history.
12. Check database rows:
    - `call_logs`
    - `conversation_sessions`
    - `conversation_messages`

Useful Prisma check:

```bash
npm --workspace @ai-salon/api exec prisma studio
```

## Webhook Behavior

Incoming call:

```text
POST /webhooks/twilio/voice
```

The backend reads:

- `To`
- `From`
- `CallSid`

It creates or updates `CallLog`, starts the Conversation Engine with channel `PHONE`, stores `twilioCallSid`, speaks the assistant message, and gathers speech/DTMF input.

Gather callback:

```text
POST /webhooks/twilio/gather
```

The backend reads:

- `SpeechResult`
- `Digits`
- `CallSid`
- `From`
- `To`

It finds the active conversation by `twilioCallSid`, sends the user message to the Conversation Engine, and returns the next TwiML response.

Status callback:

```text
POST /webhooks/twilio/status
```

The backend updates `CallLog` with:

- `endedAt`
- `durationSeconds`
- `outcome` when the call fails or completes through the conversation flow

## Serbian Salon Phone Setup

For MVP/testing, publish or call the Twilio number directly.

For real Serbian salons, there are two likely options:

- The salon publishes the Twilio number as its booking number.
- The salon keeps its existing mobile number and configures call forwarding to the Twilio number.

Call forwarding support and cost must be verified manually with Serbian operators:

- MTS
- Yettel
- A1

Each operator may have different forwarding codes, app settings, tariffs, and roaming behavior. Verify with the operator before promising production behavior to salons.

## Common Problems

Webhook is not called:

- Check that the Twilio number Voice webhook is configured.
- Check that the method is POST.
- Check that ngrok is running.
- Check that the ngrok URL uses HTTPS.
- Check that the API is running on port `4000`.

ngrok URL changed:

- Free ngrok URLs often change after restart.
- Update `PUBLIC_WEBHOOK_BASE_URL`.
- Update the Twilio phone number webhook URLs.
- Restart the API.

Wrong HTTP method:

- Use POST for Voice webhook and Status callback.

Invalid env variables:

- Make sure `.env` has `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, and `PUBLIC_WEBHOOK_BASE_URL`.
- Restart the API after changes.

Signature validation fails locally:

- Set `TWILIO_VALIDATE_SIGNATURE=false` while using ngrok locally.
- For production, use `TWILIO_VALIDATE_SIGNATURE=true`.
- The public URL used by Twilio must exactly match the URL used by the backend for validation.

Speech recognition does not understand Serbian well:

- The MVP uses Twilio `<Gather input="speech dtmf" language="sr-RS">`.
- Serbian recognition quality may vary.
- Keypad fallback is enabled: `1` maps to `da`, `2` maps to `ne`.
- Future OpenAI Realtime or another voice layer can replace this without changing the Booking Engine.

Salon not found by Twilio number:

- Ensure the salon has `twilioPhoneNumber` set exactly to Twilio's `To` number.
- Use E.164 format.
- For production, do not rely on the single-active-salon fallback.

Call hangs up immediately:

- Check `salon.isActive`.
- Check `VOICE` feature.
- Check `AI_RECEPTIONIST` feature.
- Check `receptionistEnabled`.
- Check working hours and `workingAfterHoursEnabled`.
- Check API logs for Twilio webhook errors.

Transfer does not work:

- Ensure `transferPhone` is set in E.164 format.
- Ensure the Twilio account is allowed to dial that destination.
- Check Twilio logs for dial errors.
