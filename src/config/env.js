import { config } from 'dotenv';
config();

export const env = {
  port: process.env.PORT || 3000,
  dbUrl: process.env.DATABASE_URL,
  verifyToken: process.env.VERIFY_TOKEN,
  accessToken: process.env.ACCESS_TOKEN,
  phoneNumberId: process.env.PHONE_NUMBER_ID,
  graphApiVersion: 'v23.0' // 
};
