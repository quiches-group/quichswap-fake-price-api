import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import config from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (config.mode === 'DEV') {
    app.enableCors();
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Quichswap fake price API')
    .setDescription('')
    .setVersion('1.0')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(config.port);
}
bootstrap();
