import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as moment from 'moment';
import { TokenPrice, TokenPriceDocument } from './token-price.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Moment } from 'moment';

@Injectable()
export class AppService {
  private readonly tokenSymbols = ['QCH', 'ST'];

  constructor(
    @InjectModel(TokenPrice.name)
    private tokenPriceModel: Model<TokenPriceDocument>,
  ) {}

  private currentTimestamp = () => moment().unix();

  @Cron('*/10 * * * * *')
  updateAllTokenPricesCron() {
    this.updateAllTokenPrices({
      minRange: 0.999,
      maxRange: 1.002,
    });
  }

  updateAllTokenPrices = async (options: {
    timestampToInject?: Moment;
    minRange: number;
    maxRange: number;
  }) => {
    const promises = this.tokenSymbols
      .map((symbol) => this.getLastTokenPrice(symbol))
      .map((price) => this.getNewPrice(price, options))
      .map(async (price) => {
        const newTokenPrice = await price;

        if (!newTokenPrice) {
          return;
        }

        const newPrice = new this.tokenPriceModel(newTokenPrice);
        return newPrice.save();
      });

    await Promise.all(promises);
  };

  private getNewPrice = async (
    price: Promise<TokenPrice>,
    options: {
      timestampToInject?: Moment;
      minRange: number;
      maxRange: number;
    },
  ): Promise<TokenPrice> => {
    const oldTokenPrice = await price;

    if (!oldTokenPrice) {
      return null;
    }

    const newTokenPrice = new TokenPrice();
    newTokenPrice.symbol = oldTokenPrice.symbol;
    newTokenPrice.timestamp =
      options?.timestampToInject?.unix() ?? this.currentTimestamp();

    const minRange = options.minRange;
    const maxRange = options.maxRange;
    const newPriceFactor = Math.random() * (maxRange - minRange) + minRange;
    const newPrice = Math.max(oldTokenPrice.price * newPriceFactor, 0);
    newTokenPrice.price = Number(newPrice.toFixed(3));

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

      returnData[graphDateString] = Math.max(
        price.price,
        returnData[graphDateString],
      );
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

  generatePrices = async () => {
    const loopDate = moment(new Date('2022/01/01'));
    const loopStop = moment().add(1, 'd');
    await this.tokenPriceModel.deleteMany({ __v: { $gte: 0 } });
    const firstSTPrice = new this.tokenPriceModel({
      symbol: 'ST',
      timestamp: moment(new Date('2022/01/01')).unix(),
      price: 1234,
    });
    await firstSTPrice.save();

    const firstQCHPrice = new this.tokenPriceModel({
      symbol: 'QCH',
      timestamp: moment(new Date('2022/01/01')).unix(),
      price: 1.234,
    });
    await firstQCHPrice.save();

    while (loopDate < loopStop) {
      await this.updateAllTokenPrices({
        timestampToInject: loopDate,
        minRange: 0.95,
        maxRange: 1.07,
      });

      loopDate.add(1, 'h');
    }
  };
}
