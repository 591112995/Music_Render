module.exports = {
  entry: "./entry.js",
  output: {
    path: __dirname + "/",
    filename: "bundle.js"
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        query: {
          presets: ['react', 'es2015']
        }
      },
      {
        test: /.less$/,
        loader: 'style-loader!css-loader!less-loader'
      }
    ]
  }
}
