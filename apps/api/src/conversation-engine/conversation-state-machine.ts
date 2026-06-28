import { Injectable } from '@nestjs/common';
import { ConversationIntent, ConversationState } from '@prisma/client';
import { DateTime } from 'luxon';
import {
  ConversationCollectedData,
  ConversationSessionView,
  ParsedUserMessage,
  SalonContextForConversation,
} from './conversation.types';

@Injectable()
export class ConversationStateMachine {
  parseUserMessage(
    message: string,
    context: SalonContextForConversation,
    session?: ConversationSessionView,
  ): ParsedUserMessage {
    const normalizedText = normalize(message);
    const service = context.services.find((candidate) =>
      hasNormalizedName(normalizedText, normalize(candidate.name)),
    );
    const worker = context.workers.find((candidate) =>
      hasNormalizedName(normalizedText, normalize(candidate.name)),
    );
    const dateTime = parseDateTime(
      normalizedText,
      context.salon.timezone || 'Europe/Belgrade',
    );
    const isConfirmation =
      hasAny(normalizedText, ['moze', 'vazi', 'potvrd', 'odgovara', 'u redu']) ||
      hasWord(normalizedText, 'da') ||
      hasWord(normalizedText, 'ok');
    const isRejection =
      hasAny(normalizedText, [
        'ne mogu',
        'ne odgovara',
        'drugi',
        'sledeci',
        'kasnije',
      ]) || hasWord(normalizedText, 'ne');
    const wantsAnyWorker = hasAny(normalizedText, [
      'svejedno',
      'bilo ko',
      'bilo koja',
      'prvi slobodan',
      'prva slobodna',
      'ko god',
    ]);
    const appointmentOptionIndex = parseOptionIndex(normalizedText);
    const intent = detectIntent(normalizedText, Boolean(service), Boolean(worker));

    return {
      rawText: message,
      normalizedText,
      intent,
      serviceId: service?.id,
      serviceName: service?.name,
      workerId: worker?.id,
      workerName: worker?.name,
      wantsAnyWorker,
      date: dateTime.date,
      preferredTimeFrom: dateTime.preferredTimeFrom,
      preferredTimeTo: dateTime.preferredTimeTo,
      isConfirmation,
      isRejection,
      appointmentOptionIndex,
      customerNameCandidate: inferCustomerName(
        message,
        normalizedText,
        session?.currentState,
      ),
      customerPhoneCandidate: inferPhone(message),
    };
  }

  updateCollectedData(
    session: ConversationSessionView,
    parsedUserMessage: ParsedUserMessage,
  ): ConversationCollectedData {
    const current = session.collectedData ?? {};
    const next: ConversationCollectedData = { ...current };

    if (
      parsedUserMessage.intent &&
      parsedUserMessage.intent !== ConversationIntent.UNKNOWN &&
      !next.intent
    ) {
      next.intent = parsedUserMessage.intent;
    }

    if (parsedUserMessage.serviceId) {
      next.serviceId = parsedUserMessage.serviceId;
      next.serviceName = parsedUserMessage.serviceName;
    }

    if (parsedUserMessage.workerId) {
      next.workerId = parsedUserMessage.workerId;
      next.workerName = parsedUserMessage.workerName;
      next.workerPreferenceSet = true;
    }

    if (parsedUserMessage.wantsAnyWorker) {
      next.workerId = null;
      next.workerName = null;
      next.workerPreferenceSet = true;
    }

    if (parsedUserMessage.date) {
      next.date = parsedUserMessage.date;
    }

    if (parsedUserMessage.preferredTimeFrom !== undefined) {
      next.preferredTimeFrom = parsedUserMessage.preferredTimeFrom;
    }

    if (parsedUserMessage.preferredTimeTo !== undefined) {
      next.preferredTimeTo = parsedUserMessage.preferredTimeTo;
    }

    if (
      session.currentState === ConversationState.BOOKING_CUSTOMER_NAME &&
      parsedUserMessage.customerNameCandidate
    ) {
      next.customerName = parsedUserMessage.customerNameCandidate;
    }

    if (parsedUserMessage.customerPhoneCandidate) {
      next.customerPhone = parsedUserMessage.customerPhoneCandidate;
    }

    return next;
  }

  getNextState(
    session: ConversationSessionView,
    parsedUserMessage: ParsedUserMessage,
  ): ConversationState {
    const intent = parsedUserMessage.intent ?? session.collectedData.intent;

    if (intent === ConversationIntent.TALK_TO_HUMAN) {
      return ConversationState.TRANSFER_TO_HUMAN;
    }

    if (intent === ConversationIntent.BOOK_APPOINTMENT) {
      return ConversationState.BOOKING_SERVICE;
    }

    if (intent === ConversationIntent.CANCEL_APPOINTMENT) {
      return ConversationState.CANCELLATION_LOOKUP;
    }

    if (intent === ConversationIntent.RESCHEDULE_APPOINTMENT) {
      return ConversationState.RESCHEDULE_LOOKUP;
    }

    return ConversationState.FALLBACK;
  }

  buildAssistantResponse(session: ConversationSessionView) {
    switch (session.currentState) {
      case ConversationState.BOOKING_SERVICE:
        return 'Koju uslugu zelite da zakazete?';
      case ConversationState.BOOKING_WORKER:
        return 'Da li zelite kod odredjene frizerke ili vam odgovara prvi slobodan termin?';
      case ConversationState.BOOKING_DATE_TIME:
        return 'Za koji dan i vreme zelite termin?';
      case ConversationState.BOOKING_CUSTOMER_NAME:
        return 'Na koje ime da zakazem termin?';
      case ConversationState.CANCELLATION_CONFIRMATION:
        return 'Da li zelite da otkazem ovaj termin?';
      case ConversationState.RESCHEDULE_DATE_TIME:
        return 'Za koji novi dan i vreme zelite termin?';
      case ConversationState.TRANSFER_TO_HUMAN:
        return 'U redu, prebacicu vas frizerki.';
      case ConversationState.FALLBACK:
        return 'Izvinite, nisam sigurna da sam razumela. Da li zelite da zakazete, otkazete ili pomerite termin?';
      default:
        return 'Kako mogu da vam pomognem?';
    }
  }
}

function detectIntent(
  normalizedText: string,
  hasService: boolean,
  hasWorker: boolean,
) {
  if (hasAny(normalizedText, ['otkaz', 'otkazi', 'otkazem'])) {
    return ConversationIntent.CANCEL_APPOINTMENT;
  }

  if (hasAny(normalizedText, ['promen', 'pomer', 'prebaci'])) {
    return ConversationIntent.RESCHEDULE_APPOINTMENT;
  }

  if (
    hasAny(normalizedText, [
      'zakaz',
      'termin',
      'sisanje',
      'feniranje',
      'farbanje',
    ]) ||
    hasService
  ) {
    return ConversationIntent.BOOK_APPOINTMENT;
  }

  if (
    hasAny(normalizedText, ['osoba', 'covek', 'uzivo', 'operater']) ||
    (hasAny(normalizedText, ['frizer']) && !hasService && !hasWorker)
  ) {
    return ConversationIntent.TALK_TO_HUMAN;
  }

  return ConversationIntent.UNKNOWN;
}

function parseDateTime(normalizedText: string, timezone: string) {
  const now = DateTime.now().setZone(timezone);
  let date: string | undefined;

  if (normalizedText.includes('prekosutra')) {
    date = now.plus({ days: 2 }).toISODate() ?? undefined;
  } else if (normalizedText.includes('sutra')) {
    date = now.plus({ days: 1 }).toISODate() ?? undefined;
  } else if (normalizedText.includes('danas')) {
    date = now.toISODate() ?? undefined;
  }

  const explicitTime = normalizedText.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  const looseTime = normalizedText.match(/\b(?:posle|pre|u)\s+([0-2]?\d)\b/);
  const time = explicitTime
    ? `${explicitTime[1].padStart(2, '0')}:${explicitTime[2]}`
    : looseTime
      ? normalizeHour(Number.parseInt(looseTime[1], 10))
      : undefined;

  if (!time) {
    return {
      date,
      preferredTimeFrom: undefined,
      preferredTimeTo: undefined,
    };
  }

  if (normalizedText.includes('pre ') && !normalizedText.includes('posle ')) {
    return {
      date,
      preferredTimeFrom: undefined,
      preferredTimeTo: time,
    };
  }

  return {
    date,
    preferredTimeFrom: time,
    preferredTimeTo: undefined,
  };
}

function normalizeHour(hour: number) {
  const normalizedHour = hour > 0 && hour < 8 ? hour + 12 : hour;
  return `${String(normalizedHour).padStart(2, '0')}:00`;
}

function parseOptionIndex(normalizedText: string) {
  const match = normalizedText.match(/\b([1-5])\b/);

  if (!match) {
    return undefined;
  }

  return Number.parseInt(match[1], 10) - 1;
}

function inferCustomerName(
  rawText: string,
  normalizedText: string,
  state?: ConversationState,
) {
  if (state !== ConversationState.BOOKING_CUSTOMER_NAME) {
    return undefined;
  }

  if (
    hasAny(normalizedText, [
      'da',
      'ne',
      'zakaz',
      'termin',
      'otkaz',
      'promen',
    ])
  ) {
    return undefined;
  }

  const value = rawText.trim();
  return value.length >= 2 ? value : undefined;
}

function inferPhone(rawText: string) {
  const match = rawText.match(/\+?[0-9][0-9\s().-]{5,}[0-9]/);
  return match?.[0]?.replace(/\s+/g, '');
}

function hasAny(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

function hasWord(value: string, word: string) {
  return new RegExp(`(^|\\s)${escapeRegExp(word)}(\\s|$)`).test(value);
}

function hasNormalizedName(value: string, normalizedName: string) {
  if (!normalizedName) {
    return false;
  }

  const pattern = normalizedName
    .split(/\s+/)
    .map((part) => escapeRegExp(part))
    .join('\\s+');

  return new RegExp(`(^|\\s)${pattern}(\\s|$)`).test(value);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase('sr-Latn')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'dj')
    .replace(/\u0452/g, 'dj')
    .replace(/[^a-z0-9:+\s.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
