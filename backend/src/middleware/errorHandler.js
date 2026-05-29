const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.type === 'validation') {
    return res.status(400).json({ error: err.message, details: err.details });
  }

  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with this information already exists.' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record does not exist.' });
  }

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again.'
    : err.message;

  res.status(statusCode).json({ error: message });
};

module.exports = errorHandler;
