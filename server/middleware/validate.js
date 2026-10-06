// Usage: validate({ body: zodSchema, query: zodSchema, params: zodSchema })
// Parsed (and coerced) values replace the originals on req.
module.exports = (schemas) => (req, res, next) => {
  try {
    for (const key of ['params', 'query', 'body']) {
      if (schemas[key]) {
        const parsed = schemas[key].parse(req[key]);
        if (key === 'query') Object.defineProperty(req, 'query', { value: parsed, writable: true });
        else req[key] = parsed;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};
