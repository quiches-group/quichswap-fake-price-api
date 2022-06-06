import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as moment from 'moment';
import { TokenPrice, TokenPriceDocument } from './token-price.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class AppService {
  private readonly tokenSymbols = ['QCH', 'ST'];

  constructor(
    @InjectModel(TokenPrice.name)
    private tokenPriceModel: Model<TokenPriceDocument>,
  ) {}

  private currentTimestamp = () => moment().unix();

  @Cron('*/10 * * * * *')
  updateAllTokenPrices() {
    this.tokenSymbols
      .map(async (token) =>
        this.tokenPriceModel.findOne({ symbol: token }).sort({ timestamp: -1 }),
      )
      .map((price) => this.getNewPrice(price))
      .forEach(async (price) => {
        const newTokenPrice = await price;

        if (!newTokenPrice) {
          return;
        }

        const newPrice = new this.tokenPriceModel(newTokenPrice);
        await newPrice.save();
      });
  }

  private getNewPrice = async (
    price: Promise<TokenPrice>,
  ): Promise<TokenPrice> => {
    const oldTokenPrice = await price;

    if (!oldTokenPrice) {
      return null;
    }

    const newTokenPrice = new TokenPrice();
    newTokenPrice.symbol = oldTokenPrice.symbol;
    newTokenPrice.timestamp = this.currentTimestamp();

    const minRange = 0.98;
    const maxRange = 1.035;
    const newPriceFactor = Math.random() * (maxRange - minRange) + minRange;
    const newPrice = Math.max(oldTokenPrice.price * newPriceFactor, 0);
    newTokenPrice.price = Number(newPrice.toFixed(3));

    console.log(`old: ${oldTokenPrice.price} | new: ${newTokenPrice.price}`);

    return newTokenPrice;
  };

  getPriceHistory = async (
    symbol: string,
  ): Promise<{ timestamp: number; price: number }[]> => {
    const prices = await this.tokenPriceModel.find({ symbol }).exec();

    return prices.map((price) => ({
      timestamp: price.timestamp,
      price: price.price,
    }));
  };

  getPrice = async (symbol: string): Promise<number> => {
    const prices = await this.tokenPriceModel.find({ symbol }).exec();

    return prices[prices.length - 1].price;
  };
}
