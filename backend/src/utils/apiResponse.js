export const sendSuccess = (
  res,
  { statusCode = 200, message, data = undefined },
) => {
  const response = { success: true, message };

  if (data !== undefined) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

export const sendError = (
  res,
  { statusCode = 500, message, errors = undefined },
) => {
  const response = { success: false, message };

  if (errors !== undefined) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};
