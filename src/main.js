// @ts-check
import * as parser from '@babel/parser'
import traverse from '@babel/traverse'
import * as babel from '@babel/core'

const code = `
import a from './a'

function square(n) {
  return n * n;
}

export default square
`

const processModule = moduleCode => {
  const imports = {}
  const moduleExports = {}

  const ast = parser.parse(moduleCode, {
    sourceType: 'module',
  })

  traverse(ast, {
    ImportDeclaration(path, stats) {
      imports[path.node.source.value] = {
        default: path.node.specifiers[0].local.name,
      }
      path.remove()
    },
    ExportDefaultDeclaration(path, stats) {
      moduleExports['default'] = path.node.declaration.name
      path.remove()
    },
  })

  const { code: codeOutput } = babel.transformFromAstSync(ast)
  return codeOutput
}

processModule(code)
