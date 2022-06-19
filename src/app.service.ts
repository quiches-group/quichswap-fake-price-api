import { Injectable, NotFoundException } from '@nestjs/common';
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
      .map((symbol) => this.getLastTokenPrice(symbol))
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

    const minRange = 0.9955;
    const maxRange = 1.005;
    const newPriceFactor = Math.random() * (maxRange - minRange) + minRange;
    const newPrice = Math.max(oldTokenPrice.price * newPriceFactor, 0);
    newTokenPrice.price = Number(newPrice.toFixed(3));

    // console.log(`old: ${oldTokenPrice.price} | new: ${newTokenPrice.price}`);

    return newTokenPrice;
  };

  getLastTokenPrice = (
    symbol: string,
    timestamp?: number,
  ): Promise<TokenPrice> => {
    if (!this.tokenSymbols.includes(symbol)) {
      throw new NotFoundException('Symbol not found');
    }

    if (!timestamp) {
      return this.tokenPriceModel
        .findOne({ symbol })
        .sort({ timestamp: -1 })
        .exec();
    }

    return this.tokenPriceModel
      .findOne({ symbol, timestamp: { $lte: timestamp } })
      .sort({ timestamp: -1 })
      .exec();
  };

  getPriceHistory = async (
    symbol: string,
  ): Promise<{ timestamp: number; price: number }[]> => {
    if (!this.tokenSymbols.includes(symbol)) {
      throw new NotFoundException('Symbol not found');
    }

    const prices = await this.tokenPriceModel.find({ symbol }).exec();

    return prices.map((price) => ({
      timestamp: price.timestamp,
      price: price.price,
    }));
  };

  getPrice = async (
    symbol: string,
    timestamp?: number,
  ): Promise<{ price: number }> => {
    const { price } = await this.getLastTokenPrice(symbol, timestamp);

    return { price };
  };

  getPriceGraph = async (
    symbol: string,
    start_date?: number,
    end_date?: number,
  ) => {
    const timeDiff = end_date - start_date;
    const graphType = timeDiff > 86400 ? 'day' : 'hour';

    const returnData = this.getBaseGraphObject(graphType, start_date, end_date);

    const data = await this.tokenPriceModel
      .find({
        symbol,
        timestamp: {
          $gte: start_date,
          $lte: end_date,
        },
      })
      .sort({ timestamp: -1 })
      .exec();

    data.forEach((price) => {
      const graphDateString = this.getGraphDateString(
        graphType,
        price.timestamp,
      );

      returnData[graphDateString] = Math.max(price.price, 0);
    });

    return Object.keys(returnData).map((key) => [key, returnData[key]]);
  };

  private getBaseGraphObject = (
    graph_type: 'day' | 'hour',
    start_date: number,
    end_date: number,
  ) => {
    const returnData = {};
    const workDate = moment.unix(start_date);

    while (workDate.unix() <= end_date) {
      returnData[this.getGraphDateString(graph_type, workDate.unix())] = 0;
      workDate.add(1, graph_type);
    }

    return returnData;
  };

  private getGraphDateString = (
    graph_type: 'day' | 'hour',
    timestamp: number,
  ) => {
    if (graph_type === 'day') {
      return moment.unix(timestamp).format('YYYY-MM-DD');
    }

    return moment.unix(timestamp).format('YYYY-MM-DD HH:00:00');
  };
}
