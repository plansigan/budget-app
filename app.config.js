module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL || '';
  return {
    ...config,
    ...(baseUrl
      ? {
          experiments: {
            ...(config.experiments || {}),
            baseUrl,
          },
        }
      : {}),
  };
};
