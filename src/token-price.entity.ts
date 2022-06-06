import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class TokenPrice {
  _id: Types.ObjectId;

  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  timestamp: number;

  @Prop({ select: false })
  __v: number;
}

export type TokenPriceDocument = TokenPrice & Document;
export const TokenPriceSchema = SchemaFactory.createForClass(TokenPrice);
