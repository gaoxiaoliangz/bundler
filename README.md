# Build my webpack

## Motivation

Just being curious.

## Implemented features

- default, named and namespaced import
- default and named export
- `.js` module is supported (loader system not implemented, `node_modules` not supported)
- the ability to use `mywebpack.config.js` to customize `entry` and `output`
- dynamic import

## How to run

```
yarn install
yarn build
yarn link
cd examples/simple
yarn install
yarn build
yarn start
```

Now, open <http://localhost:5000/>, you should see the results produced by the bundled js code.
