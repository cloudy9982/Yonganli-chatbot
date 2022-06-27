const sensorUrl = process.env.SENSOR_API;
const key = process.env.KEY;
const crypto = require('crypto');
const fetch = require('node-fetch');

export async function fetchSensorData() {
  return fetch(`${sensorUrl}?params=soil_temperature%2Csoil_moisture%2Csoil_conductivity`, {
    headers: {
      'Authorization': `Bearer ${key}`
    }
  })
    .then((x: any) => x.json())
    .catch(console.log);
}

// fetch('https://data.agriweather.online/api/v1/devices/FDxjm4ej/realtime?params=soil_temperature%2Csoil_moisture%2Csoil_conductivity', {
//   headers: {
//     'Authorization': 'Bearer TzJKZDBJWVhNdXNZVnEwNjZpS204MGpzZHVsTzc5emFGcGFQM000NkVsRmhrS2l0b3BPYU9KaVI4Z2Nv62b7056d60ec1'
//   }
// })
//    .then((x) => x.json())
//     .then((y) => console.log(y))
//   .catch(console.log);