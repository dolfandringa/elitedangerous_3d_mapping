const path = require('path');

module.exports = {
  // Set debugging source maps to be "inline" for
  // simplicity and ease of use
  devtool: 'inline-source-map',
  devServer: {
    contentBase: path.join(__dirname, 'docs'),
    compress: true,
    port: 9000,
    publicPath: '/dist/',
    filename: 'bundle.js',
  },

  // The application entry point
  entry: './src/index.tsx',

  // Where to compile the bundle
  // By default the output directory is `dist`
  output: {
    path: path.resolve(__dirname, 'docs/dist'), // string
    filename: 'bundle.js',
  },

  // Supported file loaders
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
      },
      {
        test: /\.css$/,
        loader: 'style-loader!css-loader',
      },
      {
        test: /\.s[a|c]ss$/,
        loader: 'sass-loader!style-loader!css-loader',
      },
      {
        test: /\.(jpg|png|gif|jpeg|woff|woff2|eot|ttf|svg)$/,
        loader: 'url-loader?limit=100000',
      },
    ],
  },

  // File extensions to support resolving
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
};
