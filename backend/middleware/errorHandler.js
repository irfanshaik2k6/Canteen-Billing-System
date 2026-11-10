function notFoundHandler(req, res, next) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

function globalErrorHandler(err, req, res, next) {
  console.error('[Error]', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error'
  });
}

module.exports = {
  notFoundHandler,
  globalErrorHandler
};

