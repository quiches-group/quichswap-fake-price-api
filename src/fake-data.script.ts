import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { AppService } from './app.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const service = app.get<AppService>(AppService);
  await service.generatePrices();
  await app.close();
}
bootstrap();
