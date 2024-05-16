const path = require('path');

module.exports = {
  mode: 'development',  // Set the mode to 'development' or 'production'
  entry: './uploads/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.bundle.js',
  },
  resolve: {
    modules: [
      path.resolve(__dirname, 'node_modules'),
      'node_modules'
    ]
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};