import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import config from './config';
import { MongooseModule } from '@nestjs/mongoose';
import { TokenPrice, TokenPriceSchema } from './token-price.entity';

@Module({
  imports: [
    MongooseModule.forRoot(config.mongoUrl),
    MongooseModule.forFeature([
      { name: TokenPrice.name, schema: TokenPriceSchema },
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
