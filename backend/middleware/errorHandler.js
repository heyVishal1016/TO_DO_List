export default function errorHandler(err, req, res, next) {
  console.error('Unhandled Server Error:', err);

  const status = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  const message = isProduction && status === 500
    ? 'Internal server error'
    : (err.message || 'Internal server error');

  return res.status(status).json({
    error: message
  });
}
