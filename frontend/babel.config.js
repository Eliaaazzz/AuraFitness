const path = require('path');
const fs = require('fs');

// 根据环境自动选择配置文件
// 优先级: .env.local > .env.development > .env.production > .env
function getEnvPath() {
  const envFiles = [
    '.env.local',           // 最高优先级，本地个人配置
    '.env.development',     // 开发环境
    '.env',                 // 默认配置
  ];
  
  for (const file of envFiles) {
    const fullPath = path.resolve(__dirname, file);
    if (fs.existsSync(fullPath)) {
      console.log(`📦 Using env file: ${file}`);
      return file;
    }
  }
  return '.env';
}

module.exports = function (api) {
  api.cache(true);

  const envPath = getEnvPath();

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: envPath,
          safe: false,
          allowUndefined: true,
        },
      ],
      [
        'module-resolver',
        {
          extensions: [
            '.ts',
            '.tsx',
            '.js',
            '.jsx',
            '.json',
          ],
          alias: {
            '@': './src',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
