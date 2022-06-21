import { FlexComponent } from '@line/bot-sdk';
export function renderPrice(money: number) {
  return money.toLocaleString();
}

export function renderTime(time: string) {
  const time_cut = time.split('T');
  return time_cut[0];
}

export function renderStatus(x: string) {
  return { preparing: '待出貨', delivered: '已出貨' }[x];
}

export function matchPhoneNum(phone: string) {
  const matches = phone.match(/^09\d{8}$/);
  return matches && matches[0];
}

export function renderStepCover(steps: any): FlexComponent {
  let url;
  if (steps.cover === undefined) {
    url = 'https://i.imgur.com/JWKFBJI.png';
  } else {
    url = steps.cover.small.url;
  }
  return {
    type: 'image',
    url,
    aspectMode: 'cover'
  };
}
