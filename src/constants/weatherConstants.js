import { WeatherType } from './weatherTypes';

export const DAYS_IN_MONTH = 31;
export const HOURS_IN_DAY = 24;

export const WEATHER_COLORS = {
  [WeatherType.NONE]: '#ffffff',
  [WeatherType.FAIR]: '#ffff00',
  [WeatherType.CLOUDY]: '#808080',
  [WeatherType.RAIN_SHOWER]: '#ADD8E6',
  [WeatherType.HEAVY_RAIN]: '#ff0000',
};

export const LOGBOOK_WEATHER_COLORS = {
  [WeatherType.NONE]: '#ffffff',
  [WeatherType.FAIR]: '#ffff00',
  [WeatherType.CLOUDY]: '#008000',
  [WeatherType.RAIN_SHOWER]: '#0000ff',
  [WeatherType.HEAVY_RAIN]: '#ff0000',
};

export const WEATHER_LABELS = {
  [WeatherType.FAIR]: 'FAIR',
  [WeatherType.CLOUDY]: 'CLOUDY',
  [WeatherType.RAIN_SHOWER]: 'SHOWERING',
  [WeatherType.HEAVY_RAIN]: 'RAINY/STORMY',
};

export const LOGBOOK_WEATHER_LABELS = {
  [WeatherType.FAIR]: 'FAIR',
  [WeatherType.CLOUDY]: 'CLOUDY',
  [WeatherType.RAIN_SHOWER]: 'RAIN SHOWER',
  [WeatherType.HEAVY_RAIN]: 'HEAVY RAIN',
};

export const INITIAL_CONTRACT_INFO = {
  contractId: '',
  projectName: '',
  location: '',
  contractor: '',
  officeName: 'REGIONAL OFFICE XIII',
  officeAddress: 'J. Rosales Avenue, Butuan City',
  month: '',
  year: '',
  signatoryName: '',
  signatoryDesignation: '',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Department_of_Public_Works_and_Highways_%28DPWH%29.svg/1280px-Department_of_Public_Works_and_Highways_%28DPWH%29.svg.png?20260123161510',
};
