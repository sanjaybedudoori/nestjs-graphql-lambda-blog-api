import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {createServer, proxy} from 'aws-serverless-express';
import { Handler, Context, Callback, APIGatewayEvent} from 'aws-lambda';
let cachedServer: any;

const bootstrapServer = async () => {
  const app = await NestFactory.create(AppModule, {cors: true});
  await app.init();
  return createServer(app.getHttpAdapter().getInstance());
}

export const handler: Handler = async (event: APIGatewayEvent, context: Context, callback: Callback) => {
  if(!cachedServer){
    cachedServer = await bootstrapServer();
  }
  return proxy(cachedServer, event, context, 'PROMISE').promise;
}
