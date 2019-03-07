// @ts-check
import * as parser from '@babel/parser'
import traverse from '@babel/traverse'
import * as babel from '@babel/core'

const code = `function square(n) {
  return n * n;
}`

const ast = parser.parse(code)

traverse(ast, {
  enter(path) {
    if (path.isIdentifier({ name: 'n' })) {
      path.node.name = 'x'
    }
  },
})

const { code: codeOutput } = babel.transformFromAstSync(ast)

console.log(codeOutput)
