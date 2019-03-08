// @ts-check
import * as parser from '@babel/parser'
import traverse from '@babel/traverse'
import * as babel from '@babel/core'
import * as path from 'path'
import * as fs from 'fs'

const getConfig = () => {
  const defaultConfigFile = 'mywebpack.config.js'
  const workingDir = process.cwd()
  const configFilePath = path.resolve(workingDir, defaultConfigFile)
  if (!fs.existsSync(configFilePath)) {
    throw new Error(`${defaultConfigFile} doesn't exist!`)
  }
  return require(configFilePath)
}

const readCodeFile = filePath =>
  fs.readFileSync(filePath, {
    encoding: 'utf8',
  })

const writeCodeToDisk = (filePath, code) => {
  fs.writeFileSync(filePath, code, {
    encoding: 'utf8',
  })
}

const codeTpl = modules => {
  return `
(function() {
  function require(id) {
    return {}
  }
  ${modules}
})()
`
}

const compile = () => {
  const config = getConfig()
  const { entry, output } = config
  const entryFileCode = readCodeFile(entry)
  const code = processModule(entryFileCode)
  const codeWithWrap = codeTpl(code)
  writeCodeToDisk(path.resolve(output, './bundle.js'), codeWithWrap)
  console.log('Build complete 🌟')
}

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

  // @ts-ignore
  const { code: codeOutput } = babel.transformFromAstSync(ast)
  return codeOutput
}

compile()
