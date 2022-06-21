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
  fetchOrders,
  fetchKeywords,
  fetchHitfood,
  fetchSeasonfood,
  fetchRecipe
} from './api';
import followJson from './json/follow.json';
import replyJson from './json/message.json';
import noOrderJson from './json/noOrder.json';
import searchRecipesJson from './json/searchRecipe.json';
import recipeIntroductionJson from './json/recipeIntroduction.json';

const followMessage = <Message>followJson;
const replyMessage = <Message>replyJson;
const noOrderMessage = <TextEventMessage>noOrderJson;
const searchMessage = <Message>searchRecipesJson;
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

async function fetchKeywordsQuickReplyItems(): Promise<QuickReplyItem[]> {
  const keywords = await fetchKeywords();
  const quickActions: QuickReplyItem[] = keywords.keywords
    .slice(0, 10)
    .map((keyword: string) => {
      return {
        type: 'action',
        action: {
          type: 'message',
          label: keyword,
          text: keyword
        }
      };
    })
    .concat({
      type: 'action',
      action: {
        type: 'uri',
        label: '看更多',
        uri: 'https://icook.tw/recipes/popular'
      }
    });
  quickActions.unshift({
    type: 'action',
    action: {
      type: 'postback',
      data: '搜尋',
      label: '🔍熱搜食譜'
    }
  });
  return quickActions as QuickReplyItem[];
}

async function renderRecommenTextMessage(userId: string): Promise<Message> {
  const name = await fetchProfileName(userId);
  return {
    type: 'text',
    text: `嗨～${name}😀🔍請輸入想搜尋的食譜，也推薦您下方【熱門食譜】以及【當季食材料理】！`
  };
}

async function renderRecommendationMessage(): Promise<Message> {
  const seasonFood = await fetchSeasonfood();
  const columns: TemplateImageColumn[] = seasonFood.stories[8].items
    .slice(0, 11)
    .map((order: any) => {
      return {
        imageUrl: order.cover_url,
        action: {
          type: 'message',
          label: order.title,
          text: order.title
        }
      };
    })
    .concat({
      imageUrl: 'https://i.imgur.com/WQAyOW2.png',
      action: {
        type: 'uri',
        label: '看更多',
        uri: `${seasonFood.stories[8].link}?openExternalBrowser=1`
      }
    });

  return {
    type: 'template',
    altText: '🌽🌿將為您呈現「當季食材料理」。',
    quickReply: {
      items: await fetchKeywordsQuickReplyItems()
    },
    template: {
      type: 'image_carousel',
      columns
    }
  };
}

async function renderHitFoodMessage(product: any): Promise<Message> {
  const columns: TemplateImageColumn[] = product.recipes
    .slice(0, 10)
    .map((recipe: any) => {
      return {
        imageUrl: recipe.cover.url,
        action: {
          type: 'postback',
          label: recipe.name.slice(0, 12),
          data: recipe.id
        }
      };
    });
  return {
    type: 'template',
    altText: '✨為您呈現搜尋的食譜',
    quickReply: {
      items: await fetchKeywordsQuickReplyItems()
    },
    template: {
      type: 'image_carousel',
      columns
    }
  };
}

async function renderQueryInstructionMessage(userId: string): Promise<Message> {
  return {
    type: 'text',
    text: `嗨～${await fetchProfileName(
      userId
    )}😀感謝您訂購愛料理市集商品📱查詢商品訂單進度，請留言【電話號碼】（範例：0912345678）將為您呈現訂購資訊，謝謝您！✨✨✨`
  };
}

async function renderOrdersMessage(
  message: TextEventMessage,
  userId: string
): Promise<Message> {
  const data = await fetchOrders(matchPhoneNum(message.text) as string, userId);
  if (data.orders === undefined || data.length === 0) return noOrderMessage;
  const contents: FlexBubble[] = data.orders
    .slice(0, 11)
    .map((order: any) => {
      return {
        type: 'bubble',
        hero: {
          type: 'image',
          action: {
            label: '訂單圖片',
            type: 'uri',
            uri: `${order.product.url}?openExternalBrowser=1`
          },
          size: 'full',
          aspectRatio: '20:13',
          aspectMode: 'cover',
          url: order.product.cover_url
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: order.product.name,
              wrap: true,
              weight: 'bold',
              size: 'xl'
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: `訂購時間：${renderTime(order.paid_at)}`,
                  wrap: true,
                  size: 'sm',
                  color: '#ADADAD'
                },
                {
                  type: 'text',
                  text: `訂單狀態：${renderStatus(order.status)}`,
                  wrap: true,
                  size: 'sm',
                  color: '#ADADAD'
                },
                {
                  type: 'text',
                  text: `商品金額：$${renderPrice(order.total)}`,
                  wrap: true,
                  size: 'sm',
                  color: '#ADADAD'
                }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: '商品館',
                uri: `${order.product.url}?openExternalBrowser=1`
              }
            },
            {
              type: 'button',
              action: {
                type: 'uri',
                label: '訂單網址',
                uri: `${order.url}?openExternalBrowser=1`
              }
            }
          ]
        }
      };
    })
    .concat({
      type: 'bubble',
      hero: {
        type: 'image',
        action: {
          label: '訂單圖片',
          type: 'uri',
          uri: 'https://market.icook.tw/orders?openExternalBrowser=1'
        },
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
        url: 'https://i.imgur.com/KF0fkhl.png'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: '查看完整訂單',
            wrap: true,
            weight: 'bold',
            size: 'xl'
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '如需查看更多訂單，請點下方「前往訂單區」將為您呈現完整訂單，謝謝您！',
                wrap: true,
                size: 'sm',
                color: '#ADADAD'
              }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '前往訂單區',
              uri: 'https://market.icook.tw/orders?openExternalBrowser=1'
            }
          }
        ]
      }
    });
  return {
    type: 'flex',
    altText: '為您呈現目前愛料理市集訂單狀態，謝謝！',
    contents: {
      type: 'carousel',
      contents
    }
  };
}

function renderStep(steps: any): FlexComponent[] {
  return [
    {
      type: 'text',
      text: `步驟 ${steps.position}`,
      weight: 'bold',
      size: 'xxl',
      margin: 'md',
      color: '#aaaaaa'
    },
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        renderStepCover(steps),
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: steps.body.replace(/\n/g, ' - ').slice(0, 110),
              wrap: true,
              size: 'md'
            }
          ],
          margin: 'md',
          width: '170px'
        }
      ],
      margin: 'md'
    }
  ];
}

async function renderRecipeMessage(recipeId: any): Promise<Message> {
  const recipe = await fetchRecipe(recipeId);
  let recipeTitle: FlexComponent[] = [];

  const ingredients: FlexComponent[] = recipe.recipe.ingredient_groups
    .slice(0, 10)
    .flatMap((eachGroups: any) => {
      return eachGroups.ingredients.slice(0, 8).flatMap((ingredient: any) => {
        return [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: ingredient.name,
                size: 'sm',
                color: '#111111',
                flex: 0
              },
              {
                type: 'text',
                text: ingredient.quantity,
                size: 'sm',
                color: '#111111',
                align: 'end'
              }
            ]
          }
        ];
      });
    });

  if (
    recipe.recipe.servings === undefined ||
    recipe.recipe.time === undefined
  ) {
    recipeTitle = [
      {
        type: 'text',
        text: '食材',
        weight: 'bold',
        size: 'xxl',
        margin: 'md',
        offsetEnd: '3px'
      },
      {
        type: 'separator',
        margin: 'md'
      },
      {
        type: 'box',
        layout: 'vertical',
        contents: ingredients.slice(0, 10),
        margin: 'md'
      }
    ];
  } else {
    recipeTitle = [
      {
        type: 'text',
        text: '食材',
        weight: 'bold',
        size: 'xxl',
        margin: 'md'
      },
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: `${recipe.recipe.servings} 人份`,
            size: 'md',
            color: '#aaaaaa',
            wrap: true
          },
          {
            type: 'text',
            text: `${recipe.recipe.time} 分鐘`,
            size: 'md',
            color: '#aaaaaa'
          }
        ]
      },
      {
        type: 'separator',
        margin: 'md'
      },
      {
        type: 'box',
        layout: 'vertical',
        contents: ingredients.slice(0, 10),
        margin: 'md'
      }
    ];
  }

  const contents: FlexBubble[] = [
    {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'image',
            url: recipe.recipe.cover.url,
            size: 'full',
            aspectMode: 'cover',
            aspectRatio: '2:3',
            gravity: 'top'
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: recipe.recipe.name,
                    size: 'xl',
                    color: '#ffffff',
                    weight: 'bold'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'image',
                        url: recipe.user.avatar_image_url,
                        aspectMode: 'cover',
                        size: 'full',
                        action: {
                          type: 'uri',
                          label: 'action',
                          uri: `https://icook.tw/users/${recipe.user.username}?openExternalBrowser=1`
                        }
                      }
                    ],
                    cornerRadius: '100px',
                    width: '72px',
                    height: '72px'
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                          {
                            type: 'text',
                            text: recipe.user.nickname,
                            wrap: true,
                            color: '#ebebeb',
                            action: {
                              type: 'uri',
                              label: 'action',
                              uri: `https://icook.tw/users/${recipe.user.username}?openExternalBrowser=1`
                            }
                          }
                        ]
                      },
                      {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                          {
                            type: 'text',
                            text: `${recipe.user.recipes_count} 食譜`,
                            color: '#8E8E8E',
                            size: 'sm',
                            flex: 0
                          },
                          {
                            type: 'text',
                            text: `${recipe.user.followers_count} 粉絲`,
                            gravity: 'bottom',
                            color: '#8E8E8E',
                            flex: 0,
                            size: 'sm'
                          }
                        ],
                        spacing: 'lg'
                      }
                    ],
                    margin: 'xxl'
                  }
                ],
                position: 'relative',
                width: '250px',
                margin: 'md'
              }
            ],
            position: 'absolute',
            offsetBottom: '0px',
            offsetStart: '0px',
            offsetEnd: '0px',
            backgroundColor: '#03303Acc',
            paddingAll: '20px',
            paddingTop: '18px'
          },
          {
            type: 'box',
            layout: 'baseline',
            contents: [
              {
                type: 'icon',
                url: 'https://i.imgur.com/COhsfHZ.png',
                offsetStart: '7px',
                offsetTop: '6px',
                size: 'sm'
              },
              {
                type: 'text',
                text: '愛料理',
                size: 'xs',
                align: 'center',
                color: '#ebebeb',
                offsetTop: '3px'
              }
            ],
            position: 'absolute',
            cornerRadius: '20px',
            offsetTop: '18px',
            offsetStart: '18px',
            height: '25px',
            width: '70px',
            backgroundColor: '#ff334b'
          }
        ],
        paddingAll: '0px'
      }
    }
  ];

  contents.push({
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: recipeTitle
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '觀看完整食材請點下方',
              color: '#aaaaaa'
            }
          ],
          alignItems: 'center'
        },
        {
          type: 'separator'
        },
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: '全部食材',
                uri: recipe.recipe.url
              },
              style: 'secondary'
            }
          ],
          paddingAll: 'md'
        }
      ]
    },
    styles: {
      footer: {
        separator: false
      }
    }
  });

  contents.push({
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: renderStep(recipe.recipe.steps[0])
    }
  });

  if (recipe.recipe.steps.length > 1) {
    contents.push({
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: renderStep(recipe.recipe.steps[1])
      },

      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '觀看完整步驟請點下方',
                color: '#aaaaaa',
                align: 'center'
              }
            ]
          },
          {
            type: 'separator'
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'button',
                action: {
                  type: 'uri',
                  label: '全部步驟',
                  uri: recipe.recipe.url
                },
                style: 'secondary'
              }
            ],
            paddingAll: 'md'
          }
        ]
      },
      styles: {
        footer: {
          separator: false
        }
      }
    });
  }

  contents.push({
    type: 'bubble',
    hero: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'image',
          url: recipe.recipe.cover.url,
          size: 'full',
          aspectRatio: '25:15',
          aspectMode: 'cover'
        }
      ]
    },
    body: {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'image',
              url: recipe.recipe.user.avatar_image_url,
              size: 'full',
              aspectMode: 'cover'
            }
          ],
          cornerRadius: 'xxl',
          width: '50px',
          height: '50px'
        },
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: recipe.user.nickname,
              weight: 'bold',
              size: 'xl',
              align: 'center'
            },
            {
              type: 'text',
              text: `${recipe.user.recipes_count} 食譜   ${recipe.user.followers_count} 粉絲`,
              color: '#aaaaaa',
              size: 'sm'
            }
          ],
          alignItems: 'flex-start',
          offsetStart: '50px'
        }
      ],
      height: '78px'
    },
    footer: {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              height: 'sm',
              action: {
                type: 'uri',
                label: '追蹤',
                uri: `https://icook.tw/users/${recipe.user.username}?openExternalBrowser=1`
              },
              color: '#FFFFFF'
            }
          ],
          width: '65px',
          alignItems: 'center',
          backgroundColor: '#66B3FF',
          cornerRadius: 'md',
          offsetBottom: '10px',
          height: '50px',
          justifyContent: 'center'
        }
      ],
      justifyContent: 'center'
    }
  });

  return {
    type: 'flex',
    altText: '✨為您呈現搜尋的食譜',
    quickReply: {
      items: await fetchKeywordsQuickReplyItems()
    },
    contents: {
      type: 'carousel',
      contents
    }
  };
}

async function handleTextMessage(
  message: TextEventMessage,
  userId: string
): Promise<Message[] | Message> {
  let recipe;
  switch (message.text) {
    case '推薦菜單':
      return [
        await renderRecommenTextMessage(userId),
        await renderRecommendationMessage()
      ];
    case '查詢訂單':
    case '訂單查詢':
      return renderQueryInstructionMessage(userId);
    case matchPhoneNum(message.text):
      return renderOrdersMessage(message, userId);
    case message.text:
      recipe = await fetchHitfood(message.text);
      if (Array.isArray(recipe.recipes) && recipe.recipes.length)
        return [recipeIntroductionMesssage, await renderHitFoodMessage(recipe)];
      break;
  }
  return [replyMessage, await renderRecommendationMessage()];
}

async function handlePostbackMessage(
  message: TextEventMessage
): Promise<Message[] | Message> {
  switch (message) {
    case '搜尋':
      return searchMessage;
    case message:
      return renderRecipeMessage(message);
    default:
      return replyMessage;
  }
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
      return client.replyMessage(event.replyToken, followMessage);
    case 'postback':
      return await client.replyMessage(
        event.replyToken,
        await handlePostbackMessage(event.postback.data as TextEventMessage)
      );
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
