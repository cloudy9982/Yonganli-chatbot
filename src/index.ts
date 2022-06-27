require('dotenv').config();
import express, { Request, Response } from 'express';
import {
  ClientConfig,
  Client,
  middleware,
  MiddlewareConfig,
  WebhookEvent,
  TextEventMessage,
  MessageAPIResponseBase,
  Message,
  FlexBubble,
  QuickReplyItem,
  TemplateImageColumn,
  FlexComponent
} from '@line/bot-sdk';
import {
  renderPrice,
  renderStatus,
  renderTime,
  matchPhoneNum,
  renderStepCover
} from './utils';
import {
  fetchSensorData
} from './api';

import followJson from './json/follow.json';
import replyJson from './json/message.json';
import noOrderJson from './json/noOrder.json';
import latestNewsJson from './json/latestNews.json';
import recipeIntroductionJson from './json/recipeIntroduction.json';

const followMessage = <Message>followJson;
const replyMessage = <Message>replyJson;
const noOrderMessage = <Message>noOrderJson;
const lastesNewsMessage = <Message>latestNewsJson;
const recipeIntroductionMesssage = <Message>recipeIntroductionJson;

const clientConfig: ClientConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.CHANNEL_SECRET
};
const middlewareConfig: MiddlewareConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET || ''
};
const app = express();
const client = new Client(clientConfig);
const port = process.env.PORT;
const util = require('util');

async function fetchProfileName(userId: string) {
  return client
    .getProfile(userId)
    .then((profile) => {
      return profile.displayName;
    })
    .catch(console.log);
}

async function renderLastestNewsTextMessage(userId: string): Promise<Message> {
  const name = await fetchProfileName(userId);
  return {
    type: 'text',
    text: `嗨～${name}😀，以下訊息為里長想通知大家的最新消息！`
  };
}

async function renderLastestNews(): Promise<Message> {
  return lastesNewsMessage;
}

async function handleTextMessage(
  message: TextEventMessage,
  userId: string
): Promise<Message[] | Message> {
  switch (message.text) {
    case '最新消息':
      return [
        await renderLastestNewsTextMessage(userId),
        await renderLastestNews()
      ];     
  }
  return [];
}

const handleEvent = async (
  event: WebhookEvent
): Promise<MessageAPIResponseBase | undefined> => {
  switch (event.type) {
    case 'message':
      switch (event.message.type) {
        case 'text':
          return await client.replyMessage(
            event.replyToken,
            await handleTextMessage(
              event.message as TextEventMessage,
              event.source.userId as string
            )
          );
      }
      break;
    case 'follow':
      //return client.replyMessage(event.replyToken, followMessage);
    case 'postback':
  }
};

app.post(
  '/webhook',
  middleware(middlewareConfig),
  async (req: Request, res: Response): Promise<Response> => {
    const events: WebhookEvent[] = req.body.events;

    const results = await Promise.all(
      events.map(async (event: WebhookEvent) => {
        try {
          await handleEvent(event);
        } catch (err: unknown) {
          if (err instanceof Error) {
            console.error(util.inspect(err, false, null, true));
          }
          return res.status(500).json({
            status: 'error'
          });
        }
      })
    );
    return res.status(200).json({
      status: 'success',
      results
    });
  }
);

app.get('/', (req, res) => {
  res.send('The server is working!');
});

app.listen(port, () => {});
