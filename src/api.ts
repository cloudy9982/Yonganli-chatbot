const sensorUrl = process.env.SENSOR_API;
const key = process.env.KEY;
const crypto = require('crypto');
const fetch = require('node-fetch');

export async function fetchSensorData() {
  return fetch(`${sensorUrl}?params=air_humidity,air_pressure,air_temperature,air_co,air_co2,air_nh3,bug_num,daily_bugs,dew_point,rain_rate,rainfalls,soil_ph,soil_temperature,soil_moisture,soil_conductivity,solar_lux,solar_par,solar_radiation,uvi,wind_direction,wind_speed`, {
    headers: {
      'Authorization': `Bearer ${key}`
    }
  })
    .then((x: any) => x.json())
    .catch(console.log);
}

// fetch('https://data.agriweather.online/api/v1/devices/FDxjm4ej/realtime?params=soil_temperature%2Csoil_moisture%2Csoil_conductivity', {
//   headers: {
//     'Authorization': 'Bearer ${key}'
//   }
// })
//    .then((x) => x.json())
//     .then((y) => console.log(y))
//   .catch(console.log);