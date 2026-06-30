import { Body, Controller, Header, HttpCode, Post, Req } from '@nestjs/common';
import { TwilioService, TwilioWebhookBody } from './twilio.service';

@Controller('webhooks/twilio')
export class TwilioController {
  constructor(private readonly twilioService: TwilioService) {}

  @Post('voice')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  voice(@Body() body: TwilioWebhookBody, @Req() request: any) {
    this.twilioService.validateWebhookRequest(
      request,
      '/webhooks/twilio/voice',
      body,
    );

    return this.twilioService.handleVoiceWebhook(body);
  }

  @Post('gather')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  gather(@Body() body: TwilioWebhookBody, @Req() request: any) {
    this.twilioService.validateWebhookRequest(
      request,
      '/webhooks/twilio/gather',
      body,
    );

    return this.twilioService.handleGatherWebhook(body);
  }

  @Post('status')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  status(@Body() body: TwilioWebhookBody, @Req() request: any) {
    this.twilioService.validateWebhookRequest(
      request,
      '/webhooks/twilio/status',
      body,
    );

    return this.twilioService.handleStatusWebhook(body);
  }
}
