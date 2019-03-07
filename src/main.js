// @ts-check
import * as parser from '@babel/parser'
import traverse from '@babel/traverse'
import * as babel from '@babel/core'

const code = `
import a from './a'

function square(n) {
  return n * n
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
      const varName = path.node.specifiers[0].local.name
      const relPath = path.node.source.value
      imports[relPath] = {
        default: varName,
      }
      const importNode = babel.template.statement
        .ast`var ${varName} = require('${relPath}')`
      path.replaceWith(importNode)
    },
    ExportDefaultDeclaration(path, stats) {
      // TODO: 暂时简单处理，明显这边还可以是其他的形式
      const defaultVarName = path.node.declaration.name
      moduleExports['default'] = defaultVarName
      const importNode = babel.template.statement
        .ast`exports.default = ${defaultVarName}`
      path.replaceWith(importNode)
    },
  })

  const { code: codeOutput } = babel.transformFromAstSync(ast)
  console.log(codeOutput)
  return codeOutput
}

processModule(code)
