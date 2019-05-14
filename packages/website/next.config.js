const webpack = require('webpack');
// eslint-disable-next-line
const images = require('./custom-plugins/mdx-image-loader');
const withMDX = require('@zeit/next-mdx')({
  extension: /\.mdx?$/,
  options: {
    mdPlugins: [images],
  },
});
const withTypescript = require('@zeit/next-typescript');
const withCSS = require('@zeit/next-css');
const withImages = require('next-images');
const path = require('path');

const getExternals = require('./next-externals');
const handleConfig = require('./src/bin/handle-config');

const configPath = process.env.DOCS_WEBSITE_CONFIG_PATH;
const cwd = process.env.DOCS_WEBSITE_CWD;

if (!cwd) {
  throw new Error('DOCS_WEBSITE_CWD is not defined');
}

const { webpack: clientWebpack } = handleConfig(cwd, configPath);

const babelExlude = filePath => {
  if (/next-server[\\/]dist[\\/]lib/.test(filePath)) {
    return false;
  }
  return /node_modules\/(?!@brisk-docs\/)/.test(filePath);
};

module.exports = withTypescript(
  withCSS(
    withImages(
      withMDX({
        pageExtensions: ['js', 'jsx', 'mdx', 'tsx', 'ts'],
        webpack(config) {
          // eslint-disable-next-line no-param-reassign
          config.externals = getExternals(cwd, config.name, config.target);

          // eslint-disable-next-line no-param-reassign
          delete config.devtool;

          // Some loaders have multiple loaders in 'use' - currently this is missing the mdx loader
          config.module.rules.forEach(loader => {
            if (loader.use.loader === 'next-babel-loader') {
              // TODO: Remove this line in prod builds
              // explanation: With preconstruct's new alias model, webpack doesn't know about it,
              // but this meant loaders weren't processing it properly when run in places other
              // than the project root (in tests and such)
              // This solves that, but is very much a hack, and can't be relied upon going forwards.
              loader.include.push(path.join(__dirname, '..'));
              // eslint-disable-next-line no-param-reassign
              loader.exclude = babelExlude;
            }
          });

          // Website modules should take precedence over the node_modules of the consumer.
          config.resolve.modules.push(__dirname, 'node_modules');

          // Adding items to globalScope in the website
          config.plugins.push(
            new webpack.ProvidePlugin({
              Props: ['pretty-proptypes', 'default'],
            }),
          );
          return clientWebpack(config);
        },
      }),
    ),
  ),
);
