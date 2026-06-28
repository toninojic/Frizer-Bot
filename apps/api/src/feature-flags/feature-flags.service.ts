import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FeatureKey, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_FEATURE_FLAGS, FEATURE_KEYS } from './feature-flags.constants';

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSalonFeatures(salonId: string) {
    await this.ensureDefaultFeaturesForSalon(salonId);
    const features = await this.prisma.salonFeature.findMany({
      where: { salonId },
    });
    const byFeatureKey = new Map(
      features.map((feature) => [feature.featureKey, feature.enabled]),
    );

    return FEATURE_KEYS.map((featureKey) => ({
      featureKey,
      enabled: byFeatureKey.get(featureKey) ?? DEFAULT_FEATURE_FLAGS[featureKey],
    }));
  }

  async isEnabled(salonId: string, featureKey: FeatureKey) {
    await this.ensureDefaultFeaturesForSalon(salonId);
    const feature = await this.prisma.salonFeature.findUnique({
      where: {
        salonId_featureKey: {
          salonId,
          featureKey,
        },
      },
      select: {
        enabled: true,
      },
    });

    return feature?.enabled ?? DEFAULT_FEATURE_FLAGS[featureKey];
  }

  async requireFeature(salonId: string, featureKey: FeatureKey) {
    if (await this.isEnabled(salonId, featureKey)) {
      return;
    }

    throw new ForbiddenException({
      message: 'Feature is disabled for this salon.',
      code: 'FEATURE_DISABLED',
      feature: featureKey,
    });
  }

  async setFeature(salonId: string, featureKey: FeatureKey, enabled: boolean) {
    await this.assertSalonExists(salonId, this.prisma);

    const feature = await this.prisma.salonFeature.upsert({
      where: {
        salonId_featureKey: {
          salonId,
          featureKey,
        },
      },
      update: { enabled },
      create: {
        salonId,
        featureKey,
        enabled,
      },
    });

    return {
      featureKey: feature.featureKey,
      enabled: feature.enabled,
    };
  }

  async ensureDefaultFeaturesForSalon(
    salonId: string,
    client: PrismaClientLike = this.prisma,
  ) {
    await this.assertSalonExists(salonId, client);

    await client.salonFeature.createMany({
      data: FEATURE_KEYS.map((featureKey) => ({
        salonId,
        featureKey,
        enabled: DEFAULT_FEATURE_FLAGS[featureKey],
      })),
      skipDuplicates: true,
    });
  }

  private async assertSalonExists(salonId: string, client: PrismaClientLike) {
    const salon = await client.salon.findUnique({
      where: { id: salonId },
      select: { id: true },
    });

    if (!salon) {
      throw new NotFoundException('SALON_NOT_FOUND');
    }
  }
}
