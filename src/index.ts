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

async function renderTeaGardenStatus(): Promise<Message> {
  const sensor = await fetchSensorData();
  const contents: FlexBubble[] = sensor.data
    .slice(0, 2)
    .map((data: any) => {
      return {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `時間:${data.time}`
            },
            {
              type: 'text',
              text: `空氣濕度（％）:${data.air_humidity}`
            },
            {
              type: 'text',
              text: `空氣氣溫（℃）:${data.air_temperature}`
            }, 
            {
              type: "text",
              text: `露點（℃）:${data.dew_point}`
            }, 
            {
              type: "text",
              text: `土壤電導度(ds/m):${data.soil_conductivity}`
            }, 
            {
              type: "text",
              text: `土壤含水量(%):${data.soil_moisture}`
            }, 
            {
              type: "text",
              text: `土壤酸鹼值:${data.soil_ph}`
            }, 
            {
              type: "text",
              text: `土壤溫度(℃):${data.soil_temperature}`
            }, 
            {
              type: "text",
              text: `光合作用有效光 PAR (μmol/m2s):${data.solar_par}`
            }, 
            {
              type: "text",
              text: `光照(W/m^2):${data.solar_radiation}`
            },
            {
              type: "text",
              text: `風速(m/s):${data.wind_speed}`
            },
          ]
        }
      };
    })
  return {
    type: 'flex',
    altText: '為您呈現農田狀態，謝謝！',
    contents: {
      type: 'carousel',
      contents
    }
  };
}

async function render(): Promise<Message> {
  return {
    type: "text",
    "text": "分享愛料理的食譜更有趣了！😊食譜訊息可左右滑動看更多豐富內容❤"
  };
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
    case '茶園狀態':
      return await renderTeaGardenStatus();
    case '1':
      
    case 'test':
      return await render();
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
            // console.error(util.inspect(err, false, null, true));
          }
          return res.status(500).json({
            status: 'error'
          });
        }
      })
    );
    if (results !== undefined) {
      return res.status(200).json({
        status: 'success',
        results
      });
    }
    return res.status(500).json({
      status: 'error'
    });
  }
);

app.get('/', (req, res) => {
  res.send('The server is working!');
});

app.listen(port, () => { });
