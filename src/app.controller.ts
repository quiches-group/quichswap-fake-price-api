import { Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { TokenPriceDocument } from './token-price.entity';

@Controller('price')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('history')
  getPriceHistory(@Query('symbol') symbol: string) {
    if (!symbol) {
      throw new NotFoundException('Symbol not found');
    }

    return this.appService.getPriceHistory(symbol);
  }

  @Get('')
  getPrice(@Query('symbol') symbol: string) {
    if (!symbol) {
      throw new NotFoundException('Symbol not found');
    }

    return this.appService.getPriceHistory(symbol);
  }
}
