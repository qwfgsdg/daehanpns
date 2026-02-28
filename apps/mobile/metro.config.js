const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const mobileModules = path.resolve(projectRoot, 'node_modules');
const rootModules = path.resolve(monorepoRoot, 'node_modules');

// expo-router bundles its own @react-navigation v7 packages
const expoRouterNavModules = path.resolve(
  rootModules, 'expo-router', 'node_modules'
);

const config = getDefaultConfig(projectRoot);

// Monorepo: watch the entire repo
config.watchFolders = [monorepoRoot];

// Resolve modules from mobile's node_modules first, then root
config.resolver.nodeModulesPaths = [
  mobileModules,
  rootModules,
];

// Keep package exports disabled to avoid breaking other packages
config.resolver.unstable_enablePackageExports = false;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Force react to ALWAYS resolve from mobile's node_modules (prevent duplicate React)
  if (moduleName === 'react' || moduleName === 'react/jsx-runtime' || moduleName === 'react/jsx-dev-runtime') {
    return {
      type: 'sourceFile',
      filePath: require.resolve(moduleName, { paths: [mobileModules] }),
    };
  }

  // Force @react-navigation/* to resolve from expo-router's bundled v7
  // Root has v6 which conflicts with expo-router's v7
  if (moduleName.startsWith('@react-navigation/')) {
    try {
      const resolved = require.resolve(moduleName, { paths: [expoRouterNavModules] });
      return { type: 'sourceFile', filePath: resolved };
    } catch (e) {
      // fallback for packages not bundled by expo-router (e.g. native-stack)
      return context.resolveRequest(context, moduleName, platform);
    }
  }

  // Redirect axios to browser build
  if (moduleName === 'axios') {
    return context.resolveRequest(context, 'axios/dist/browser/axios.cjs', platform);
  }

  // Block node: protocol modules
  if (moduleName.startsWith('node:')) {
    return { type: 'empty' };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
