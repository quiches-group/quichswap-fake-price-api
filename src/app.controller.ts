import { Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

@Controller('price')
@ApiTags('Price')
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
  @ApiQuery({ name: 'timestamp', required: false })
  getPrice(
    @Query('symbol') symbol: string,
    @Query('timestamp') timestamp?: number,
  ) {
    if (!symbol) {
      throw new NotFoundException('Symbol not found');
    }

    return this.appService.getPrice(symbol, timestamp);
  }
}
