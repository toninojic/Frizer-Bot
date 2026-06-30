export default () => ({
  app: {
    port: Number.parseInt(process.env.PORT ?? '4000', 10),
    publicWebhookBaseUrl: process.env.PUBLIC_WEBHOOK_BASE_URL ?? '',
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? '',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  internalTools: {
    apiKey: process.env.INTERNAL_TOOLS_API_KEY ?? '',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
    authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER ?? '',
    validateSignature: process.env.TWILIO_VALIDATE_SIGNATURE === 'true',
  },
});
