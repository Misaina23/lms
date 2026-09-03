module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Transform import.meta for web compatibility
          unstable_transformImportMeta: true,
        },
      ],
    ],
    plugins: ['@babel/plugin-proposal-class-properties', '@babel/plugin-proposal-private-methods', '@babel/plugin-proposal-private-property-in-object'],
  };
};

