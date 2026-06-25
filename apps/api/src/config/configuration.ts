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
});
