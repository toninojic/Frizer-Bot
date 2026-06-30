import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CallOutcome,
  ConversationChannel,
  ConversationSessionStatus,
  ConversationState,
  DayOfWeek,
  FeatureKey,
} from '@prisma/client';
import { DateTime } from 'luxon';
import twilio from 'twilio';
import { ConversationEngineService } from '../conversation-engine/conversation-engine.service';
import { ConversationAction } from '../conversation-engine/conversation.types';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { PrismaService } from '../prisma/prisma.service';

export type TwilioWebhookBody = Record<string, string | string[] | undefined>;

type SalonForVoice = {
  id: string;
  name: string;
  phone: string;
  twilioPhoneNumber: string | null;
  timezone: string;
  isActive: boolean;
  receptionistEnabled: boolean;
  transferPhone: string | null;
  workingAfterHoursEnabled: boolean;
};

const TERMINAL_CALL_STATUSES = new Set([
  'completed',
  'failed',
  'busy',
  'no-answer',
  'canceled',
]);

const FAILED_CALL_STATUSES = new Set(['failed', 'busy', 'no-answer', 'canceled']);

@Injectable()
export class TwilioService {
  constructor(
    private readonly configService: ConfigService,
    private readonly conversationEngine: ConversationEngineService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly prisma: PrismaService,
  ) {}

  validateWebhookRequest(
    request: {
      headers?: Record<string, string | string[] | undefined>;
      protocol?: string;
      get?: (name: string) => string | undefined;
    },
    path: string,
    body: TwilioWebhookBody,
  ) {
    if (!this.configService.get<boolean>('twilio.validateSignature')) {
      return;
    }

    const authToken = this.configService.get<string>('twilio.authToken');
    const signature = this.headerValue(
      request.headers?.['x-twilio-signature'],
    );

    if (!authToken || !signature) {
      throw new UnauthorizedException('TWILIO_SIGNATURE_MISSING');
    }

    const valid = twilio.validateRequest(
      authToken,
      signature,
      this.webhookUrl(path, request),
      this.flattenBody(body),
    );

    if (!valid) {
      throw new UnauthorizedException('TWILIO_SIGNATURE_INVALID');
    }
  }

  async handleVoiceWebhook(body: TwilioWebhookBody) {
    const callSid = this.bodyValue(body.CallSid);
    const from = this.bodyValue(body.From);
    const to = this.bodyValue(body.To);
    const salon = await this.findSalonForTwilioNumber(to);

    if (!salon) {
      return this.sayAndHangup(
        'Zao nam je, trenutno ne mozemo da pronadjemo salon za ovaj broj.',
      );
    }

    await this.upsertCallLog({
      salonId: salon.id,
      customerPhone: from,
      twilioCallSid: callSid,
      outcome: CallOutcome.INFO_ONLY,
    });

    if (!salon.isActive) {
      await this.updateCallOutcome(callSid, CallOutcome.FAILED);
      return this.sayAndHangup('Salon trenutno nije aktivan.');
    }

    const voiceEnabled = await this.featureFlagsService.isEnabled(
      salon.id,
      FeatureKey.VOICE,
    );
    const aiEnabled = await this.featureFlagsService.isEnabled(
      salon.id,
      FeatureKey.AI_RECEPTIONIST,
    );

    if (!voiceEnabled) {
      if (salon.transferPhone) {
        await this.updateCallOutcome(callSid, CallOutcome.TRANSFERRED);
        return this.sayAndDial(
          'Telefonsko zakazivanje trenutno nije dostupno. Prebacujem vas salonu.',
          salon.transferPhone,
        );
      }

      return this.sayAndHangup('Telefonsko zakazivanje trenutno nije dostupno.');
    }

    if (!aiEnabled) {
      if (salon.transferPhone) {
        await this.updateCallOutcome(callSid, CallOutcome.TRANSFERRED);
        return this.sayAndDial('Prebacujem vas frizerki.', salon.transferPhone);
      }

      return this.sayAndHangup(
        'Recepcionarka trenutno nije aktivna. Molimo pokusajte kasnije.',
      );
    }

    if (!salon.receptionistEnabled) {
      return this.sayAndHangup(
        'Recepcionarka trenutno nije aktivna. Molimo pokusajte kasnije.',
      );
    }

    if (
      !salon.workingAfterHoursEnabled &&
      !(await this.isSalonOpenNow(salon.id, salon.timezone))
    ) {
      return this.sayAndHangup(
        'Salon trenutno ne radi. Molimo pozovite nas tokom radnog vremena.',
      );
    }

    const conversation = await this.conversationEngine.startConversation({
      salonId: salon.id,
      channel: ConversationChannel.PHONE,
      customerPhone: from,
      twilioCallSid: callSid,
    });
    await this.appendTranscript(
      callSid,
      `Recepcionerka: ${conversation.assistantMessage}`,
    );

    return this.gatherResponse(conversation.assistantMessage);
  }

  async handleGatherWebhook(body: TwilioWebhookBody) {
    const callSid = this.bodyValue(body.CallSid);
    const from = this.bodyValue(body.From);
    const to = this.bodyValue(body.To);
    const message = this.userMessageFromGather(body);

    const session = await this.findConversationSession(callSid, from, to);

    if (!session) {
      return this.sayAndHangup(
        'Zao nam je, razgovor nije pronadjen. Molimo pozovite ponovo.',
      );
    }

    if (!message) {
      return this.gatherResponse(
        'Nisam cula odgovor. Molim vas recite da li zelite da zakazete, otkazete ili pomerite termin.',
      );
    }

    const response = await this.conversationEngine.handleUserMessage(
      session.id,
      message,
    );
    await this.appendTranscript(
      callSid,
      `Klijent: ${message}\nRecepcionerka: ${response.assistantMessage}`,
    );

    const transferAction = response.actions.find(
      (action): action is Extract<ConversationAction, { type: 'TRANSFER_CALL' }> =>
        action.type === 'TRANSFER_CALL',
    );

    if (transferAction) {
      await this.updateCallOutcome(callSid, CallOutcome.TRANSFERRED);
      return this.sayAndDial(response.assistantMessage, transferAction.transferPhone);
    }

    if (this.isTerminalConversationState(response.state)) {
      await this.updateCallOutcome(
        callSid,
        this.outcomeForConversationState(response.state),
      );
      return this.sayAndHangup(response.assistantMessage);
    }

    return this.gatherResponse(response.assistantMessage);
  }

  async handleStatusWebhook(body: TwilioWebhookBody) {
    const callSid = this.bodyValue(body.CallSid);
    const callStatus = this.bodyValue(body.CallStatus)?.toLowerCase();
    const durationSeconds = this.parseDuration(
      this.bodyValue(body.CallDuration) ?? this.bodyValue(body.Duration),
    );

    if (callSid) {
      const updateData = {
        endedAt:
          callStatus && TERMINAL_CALL_STATUSES.has(callStatus)
            ? new Date()
            : undefined,
        durationSeconds,
        outcome:
          callStatus && FAILED_CALL_STATUSES.has(callStatus)
            ? CallOutcome.FAILED
            : undefined,
      };

      await this.prisma.callLog.updateMany({
        where: { twilioCallSid: callSid },
        data: updateData,
      });

      if (callStatus && TERMINAL_CALL_STATUSES.has(callStatus)) {
        await this.prisma.conversationSession.updateMany({
          where: {
            twilioCallSid: callSid,
            status: ConversationSessionStatus.ACTIVE,
          },
          data: {
            status: ConversationSessionStatus.COMPLETED,
            currentState: ConversationState.END,
            endedAt: new Date(),
          },
        });
      }
    }

    return this.emptyResponse();
  }

  private async findSalonForTwilioNumber(to?: string) {
    if (to) {
      const salon = await this.prisma.salon.findUnique({
        where: { twilioPhoneNumber: to },
        select: this.salonSelect(),
      });

      if (salon) {
        return salon;
      }
    }

    const activeSalons = await this.prisma.salon.findMany({
      where: { isActive: true },
      select: this.salonSelect(),
      take: 2,
    });

    return activeSalons.length === 1 ? activeSalons[0] : null;
  }

  private async findConversationSession(
    callSid?: string,
    customerPhone?: string,
    to?: string,
  ) {
    if (callSid) {
      const byCallSid = await this.prisma.conversationSession.findFirst({
        where: {
          twilioCallSid: callSid,
          status: ConversationSessionStatus.ACTIVE,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (byCallSid) {
        return byCallSid;
      }
    }

    const callLog = callSid
      ? await this.prisma.callLog.findUnique({
          where: { twilioCallSid: callSid },
          select: { salonId: true },
        })
      : null;
    const salonId =
      callLog?.salonId ?? (await this.findSalonForTwilioNumber(to))?.id;

    if (!salonId || !customerPhone) {
      return null;
    }

    return this.prisma.conversationSession.findFirst({
      where: {
        salonId,
        customerPhone,
        channel: ConversationChannel.PHONE,
        status: ConversationSessionStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async isSalonOpenNow(salonId: string, timezone: string) {
    const now = DateTime.now().setZone(timezone || 'Europe/Belgrade');
    const workingHour = await this.prisma.workingHour.findUnique({
      where: {
        salonId_dayOfWeek: {
          salonId,
          dayOfWeek: dayOfWeekFromLuxon(now.weekday),
        },
      },
      select: {
        opensAt: true,
        closesAt: true,
        isClosed: true,
      },
    });

    if (
      !workingHour ||
      workingHour.isClosed ||
      !workingHour.opensAt ||
      !workingHour.closesAt
    ) {
      return false;
    }

    const localDate = now.toISODate();
    const opensAt = DateTime.fromISO(`${localDate}T${workingHour.opensAt}`, {
      zone: timezone,
    });
    const closesAt = DateTime.fromISO(`${localDate}T${workingHour.closesAt}`, {
      zone: timezone,
    });

    return now >= opensAt && now < closesAt;
  }

  private async upsertCallLog(input: {
    salonId: string;
    customerPhone?: string;
    twilioCallSid?: string;
    outcome: CallOutcome;
  }) {
    if (input.twilioCallSid) {
      return this.prisma.callLog.upsert({
        where: { twilioCallSid: input.twilioCallSid },
        update: {
          salonId: input.salonId,
          customerPhone: input.customerPhone,
        },
        create: {
          salonId: input.salonId,
          customerPhone: input.customerPhone,
          twilioCallSid: input.twilioCallSid,
          startedAt: new Date(),
          outcome: input.outcome,
        },
      });
    }

    return this.prisma.callLog.create({
      data: {
        salonId: input.salonId,
        customerPhone: input.customerPhone,
        startedAt: new Date(),
        outcome: input.outcome,
      },
    });
  }

  private async appendTranscript(callSid: string | undefined, text: string) {
    if (!callSid) {
      return;
    }

    const callLog = await this.prisma.callLog.findUnique({
      where: { twilioCallSid: callSid },
      select: { transcript: true },
    });

    if (!callLog) {
      return;
    }

    await this.prisma.callLog.update({
      where: { twilioCallSid: callSid },
      data: {
        transcript: callLog.transcript
          ? `${callLog.transcript}\n${text}`
          : text,
      },
    });
  }

  private async updateCallOutcome(
    twilioCallSid: string | undefined,
    outcome: CallOutcome,
  ) {
    if (!twilioCallSid) {
      return;
    }

    await this.prisma.callLog.updateMany({
      where: { twilioCallSid },
      data: { outcome },
    });
  }

  private gatherResponse(message: string) {
    const response = new twilio.twiml.VoiceResponse();
    const gather = response.gather({
      input: ['speech', 'dtmf'],
      action: this.publicWebhookUrl('/webhooks/twilio/gather'),
      method: 'POST',
      language: 'sr-RS' as any,
      speechTimeout: 'auto',
      timeout: 6,
      numDigits: 1,
      finishOnKey: '#',
    });
    gather.say(this.sayAttributes(), message);
    response.say(
      this.sayAttributes(),
      'Nismo culi odgovor. Molimo pozovite ponovo.',
    );
    response.hangup();

    return response.toString();
  }

  private sayAndHangup(message: string) {
    const response = new twilio.twiml.VoiceResponse();
    response.say(this.sayAttributes(), message);
    response.hangup();

    return response.toString();
  }

  private sayAndDial(message: string, phoneNumber: string) {
    const response = new twilio.twiml.VoiceResponse();
    response.say(this.sayAttributes(), message);
    response.dial(phoneNumber);

    return response.toString();
  }

  private emptyResponse() {
    return new twilio.twiml.VoiceResponse().toString();
  }

  private sayAttributes() {
    return { language: 'sr-RS' as any };
  }

  private userMessageFromGather(body: TwilioWebhookBody) {
    const speech = this.bodyValue(body.SpeechResult)?.trim();

    if (speech) {
      return speech;
    }

    const digits = this.bodyValue(body.Digits)?.trim();

    if (digits === '1') {
      return 'da';
    }

    if (digits === '2') {
      return 'ne';
    }

    return digits;
  }

  private isTerminalConversationState(state: ConversationState) {
    const terminalStates: ConversationState[] = [
      ConversationState.BOOKING_COMPLETED,
      ConversationState.CANCELLATION_COMPLETED,
      ConversationState.RESCHEDULE_COMPLETED,
      ConversationState.END,
    ];

    return terminalStates.includes(state);
  }

  private outcomeForConversationState(state: ConversationState) {
    if (state === ConversationState.BOOKING_COMPLETED) {
      return CallOutcome.BOOKED;
    }

    if (state === ConversationState.CANCELLATION_COMPLETED) {
      return CallOutcome.CANCELLED;
    }

    return CallOutcome.INFO_ONLY;
  }

  private parseDuration(value?: string) {
    if (!value) {
      return undefined;
    }

    const duration = Number.parseInt(value, 10);
    return Number.isFinite(duration) ? duration : undefined;
  }

  private flattenBody(body: TwilioWebhookBody) {
    return Object.fromEntries(
      Object.entries(body).flatMap(([key, value]) => {
        const normalized = this.bodyValue(value);
        return normalized === undefined ? [] : [[key, normalized]];
      }),
    );
  }

  private bodyValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
  }

  private headerValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
  }

  private publicWebhookUrl(path: string) {
    const baseUrl = this.configService
      .get<string>('app.publicWebhookBaseUrl')
      ?.replace(/\/$/, '');

    return baseUrl ? `${baseUrl}${path}` : path;
  }

  private webhookUrl(
    path: string,
    request: {
      protocol?: string;
      get?: (name: string) => string | undefined;
    },
  ) {
    const configuredUrl = this.publicWebhookUrl(path);

    if (configuredUrl.startsWith('http')) {
      return configuredUrl;
    }

    const host = request.get?.('host');
    const protocol = request.protocol ?? 'https';

    return host ? `${protocol}://${host}${path}` : configuredUrl;
  }

  private salonSelect() {
    return {
      id: true,
      name: true,
      phone: true,
      twilioPhoneNumber: true,
      timezone: true,
      isActive: true,
      receptionistEnabled: true,
      transferPhone: true,
      workingAfterHoursEnabled: true,
    } satisfies Record<keyof SalonForVoice, true>;
  }
}

function dayOfWeekFromLuxon(weekday: number) {
  const byWeekday: Record<number, DayOfWeek> = {
    1: DayOfWeek.MONDAY,
    2: DayOfWeek.TUESDAY,
    3: DayOfWeek.WEDNESDAY,
    4: DayOfWeek.THURSDAY,
    5: DayOfWeek.FRIDAY,
    6: DayOfWeek.SATURDAY,
    7: DayOfWeek.SUNDAY,
  };

  return byWeekday[weekday];
}
