const path = require('path')

module.exports = {
  entry: path.resolve(__dirname, './src/index.js'),
  output: {
    path: path.resolve(__dirname, './dist-webpack'),
    filename: 'app.js',
    publicPath: '/dist-webpack/',
  },
  mode: 'development',
}
