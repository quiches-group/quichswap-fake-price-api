// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

export default {
  mongoUrl: process.env.MONGO_URL,
  port: process.env.PORT,
  mode: process.env.MODE,
};
