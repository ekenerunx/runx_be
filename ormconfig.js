const {
  DATABASE_TYPE,
  DATABASE_HOST,
  DATABASE_PORT,
  DATABASE_USERNAME,
  DATABASE_PASSWORD,
  DATABASE_NAME,
  DATABASE_CONNECTION_URL,
} = process.env;

module.exports = {
  type: DATABASE_TYPE,
  host: DATABASE_HOST,
  port: parseInt(DATABASE_PORT, 10) || 5432,
  username: DATABASE_USERNAME,
  password: DATABASE_PASSWORD,
  database: DATABASE_NAME,
  connectionUrl: DATABASE_CONNECTION_URL,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: false,
};
