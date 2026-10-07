export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const parsed = schema.parse(dataToValidate);
      req[source] = parsed; // Use parsed and stripped data
      next();
    } catch (error) {
      const zodIssues = error.issues || error.errors;
      if (zodIssues) {
        const issues = zodIssues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          error: 'Validation Error',
          message: issues[0]?.message || 'Invalid input data',
          issues,
        });
      }
      return res.status(400).json({ error: 'Validation Error', message: error.message });
    }
  };
};
