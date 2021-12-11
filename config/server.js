module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: process.env.REDIRECT,
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET', process.env.ADMIN_JWT_KEY),
    },
  },
  
}
);
