export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.errors;
      const error = issues.map((e) => e.message).join('; ');
      return res.status(400).json({ error, issues });
    }
    req.validated = result.data;
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const issues = result.error.errors;
      const error = issues.map((e) => e.message).join('; ');
      return res.status(400).json({ error, issues });
    }
    req.validatedQuery = result.data;
    next();
  };
}

export const validate = validateBody;
