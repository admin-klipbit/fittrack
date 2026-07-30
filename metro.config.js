const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// markdown-it (Coach tab renderer) imports Node's `punycode`; map it to the npm package.
config.resolver.extraNodeModules = {
  punycode: require.resolve('punycode/'),
};

module.exports = config;
