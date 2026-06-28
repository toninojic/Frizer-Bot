# Conversation Engine

## Purpose

The Conversation Engine is the channel-independent state machine for the AI salon receptionist. It owns the booking conversation flow, decides what information is missing, calls approved backend tools, and returns the next assistant message plus optional actions.

It exists so Twilio Voice, WhatsApp, Instagram DM, web chat, and future manual assistant surfaces do not each invent their own booking logic. Channels should pass user messages into the engine and render the engine response. The engine then calls the API Tool Layer, which calls the Booking Engine and database-backed services.

```text
Channel Adapter
  -> Conversation Engine
  -> API Tool Layer
  -> Booking Engine / Business Services
  -> Database
```

This phase intentionally does not include OpenAI Realtime, Twilio live audio, WhatsApp provider logic, Instagram provider logic, SMS sending, production call transfer, advanced Serbian NLP, or a knowledge base.

## API

The internal endpoints are protected by `x-internal-tools-key`, using the same `INTERNAL_TOOLS_API_KEY` as the Tool Layer.

```text
POST /conversation/start
POST /conversation/:sessionId/message
POST /conversation/:sessionId/end
```

Start input:

```json
{
  "salonId": "salon-id",
  "channel": "PHONE",
  "customerPhone": "+381641234567"
}
```

Message input:

```json
{
  "message": "Hocu sisanje danas posle 4"
}
```

Response shape:

```json
{
  "sessionId": "session-id",
  "state": "BOOKING_WORKER",
  "assistantMessage": "Da li zelite kod odredjene frizerke ili vam odgovara prvi slobodan termin?",
  "actions": []
}
```

Actions are reserved for channel adapters. The current implemented action is:

```json
{
  "type": "TRANSFER_CALL",
  "transferPhone": "+381641112223"
}
```

Future actions can include `SEND_SMS`, `END_CALL`, `CREATE_REMINDER`, and `LOG_EVENT`.

## Sessions And Messages

Each conversation creates a `ConversationSession` row. The session stores:

- salon and channel
- optional customer phone from the channel
- status: `ACTIVE`, `COMPLETED`, `TRANSFERRED`, `FAILED`
- current state
- structured `collectedData`
- last user and assistant messages
- start and end timestamps

Every user message, assistant message, and important system transition is stored in `ConversationMessage`. Transition metadata records the previous and next state. Tool execution details stay in `tool_execution_logs`, owned by the Tool Layer.

## States

```text
START
  -> GREETING
  -> INTENT_DETECTION
      -> BOOK_APPOINTMENT -> BOOKING_SERVICE
                          -> BOOKING_WORKER
                          -> BOOKING_DATE_TIME
                          -> BOOKING_SLOT_CONFIRMATION
                          -> BOOKING_CUSTOMER_NAME
                          -> BOOKING_FINAL_CONFIRMATION
                          -> BOOKING_COMPLETED
                          -> END
      -> CANCEL_APPOINTMENT -> CANCELLATION_LOOKUP
                            -> CANCELLATION_CONFIRMATION
                            -> CANCELLATION_COMPLETED
                            -> END
      -> RESCHEDULE_APPOINTMENT -> RESCHEDULE_LOOKUP
                                -> RESCHEDULE_DATE_TIME
                                -> RESCHEDULE_SLOT_CONFIRMATION
                                -> RESCHEDULE_COMPLETED
                                -> END
      -> TALK_TO_HUMAN -> TRANSFER_TO_HUMAN
      -> UNKNOWN -> FALLBACK
```

The Prisma enum also includes `END`, and sessions can finish with status `COMPLETED` or `TRANSFERRED`.

## Intents

The deterministic MVP parser returns one of:

- `BOOK_APPOINTMENT`
- `CANCEL_APPOINTMENT`
- `RESCHEDULE_APPOINTMENT`
- `TALK_TO_HUMAN`
- `UNKNOWN`

Intent detection is intentionally simple. It checks normalized Serbian text for keywords such as `zakaz`, `termin`, service names, `otkaz`, `promen`, `pomer`, `prebaci`, `osoba`, `covek`, `uzivo`, and `operater`. Salon service and worker names are matched from `getSalonContext`.

Date and time parsing supports:

- `danas`
- `sutra`
- `prekosutra`
- `posle X`
- `pre X`
- `u X`
- `HH:mm`

This is not advanced NLP. Future AI can produce a cleaner parsed message, but it should still feed the same engine flow.

## Collected Data

`collectedData` stores conversation progress as structured JSON:

```json
{
  "intent": "BOOK_APPOINTMENT",
  "serviceId": "service-id",
  "serviceName": "Sisanje",
  "workerId": "worker-id",
  "workerName": "Ana",
  "date": "2026-06-26",
  "preferredTimeFrom": "16:00",
  "preferredTimeTo": null,
  "selectedSlot": {
    "startAt": "2026-06-26T14:00:00.000Z",
    "endAt": "2026-06-26T14:30:00.000Z",
    "workerId": "worker-id",
    "workerName": "Ana"
  },
  "customerName": "Marko",
  "customerPhone": "+381641234567",
  "appointmentId": null,
  "fallbackCount": 0
}
```

Phone number from the channel is reused. The engine only asks for a phone number when it is missing and required.

## Booking Flow

The booking flow collects service, worker preference, date/time, slot confirmation, customer name, and final confirmation. If service is detected in the first user message, the engine skips asking for service. If the user says `svejedno`, `bilo ko`, or `prvi slobodan`, `workerId` remains `null` and the Booking Engine can find the first available worker.

The engine calls `findAvailableSlots` through the Tool Layer and offers one best slot first. If the user rejects it, the engine offers the next returned slot. If no slots are available today, it retries the next day once. Final booking calls `bookAppointment` through the Tool Layer.

The Conversation Engine must not call the Booking Engine or Prisma directly for booking actions.

## Cancellation Flow

Cancellation uses the session phone number when available. The engine calls `findUpcomingAppointmentsForCustomer` through the Tool Layer.

- No appointments: tell the user nothing was found and complete the session.
- One appointment: ask for confirmation.
- Multiple appointments: list options and ask which one.

After confirmation, the engine calls `cancelAppointment`, confirms cancellation, and completes the session.

## Reschedule Flow

Reschedule also starts by finding upcoming appointments for the session phone number.

- No appointments: tell the user nothing was found and complete the session.
- One appointment: continue with the new date/time.
- Multiple appointments: ask the user to choose.

The engine then asks for the new date/time, calls `findAvailableSlots`, asks for slot confirmation, calls `rescheduleAppointment`, confirms the new appointment, and completes the session.

## Transfer To Human

If the user asks for a person, or the fallback count reaches three, the engine calls `transferCall` through the Tool Layer. The session status becomes `TRANSFERRED`, and the response includes a `TRANSFER_CALL` action when a transfer phone is available.

The action is only a decision. Twilio or another channel adapter will later perform the real transfer.

## Fallbacks

Unknown or unclear messages move the session to `FALLBACK` and increment `fallbackCount`. The assistant asks whether the user wants to book, cancel, or move an appointment. On the third fallback, the engine transfers to a human.

## Feature Checks

Conversation start validates channel features before continuing:

- `PHONE`: `VOICE` and `AI_RECEPTIONIST`
- `WHATSAPP`: `WHATSAPP` and `AI_RECEPTIONIST`
- `INSTAGRAM`: `INSTAGRAM` and `AI_RECEPTIONIST`
- `WEB_CHAT`: `AI_RECEPTIONIST`
- `MANUAL`: `MANUAL_BOOKING`

The Tool Layer also enforces feature flags for tool execution. Keep both checks: the engine gives early failure, and the Tool Layer protects the backend boundary.

## Error Handling

Tool responses use the standard shape:

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

The engine converts disabled features to forbidden errors and other tool failures to bad requests. User-facing channel adapters can later map these backend codes to localized channel copy.

## Adding Future Channels

A channel adapter should:

1. Start a session with `POST /conversation/start`.
2. Send each recognized user message to `POST /conversation/:sessionId/message`.
3. Speak, display, or send `assistantMessage`.
4. Execute returned `actions` in the channel.
5. End the session with `POST /conversation/:sessionId/end` when the channel closes.

The adapter should not call Booking Engine routes directly and should not query Prisma.

## Safe Flow Changes

When changing the flow:

- Add or update Prisma enums only through migrations.
- Keep `collectedData` backward compatible where possible.
- Prefer adding parser rules in `ConversationStateMachine` and business steps in `ConversationEngineService`.
- Use Tool Layer methods for backend actions.
- Save both user and assistant messages for every turn.
- Add tests for new states, intents, and tool calls.
- Update this document when states, actions, or collected data change.
