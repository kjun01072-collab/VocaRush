const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = false;
config.resolver.resolverMainFields = ["react-native", "browser", "main"];

module.exports = config;
