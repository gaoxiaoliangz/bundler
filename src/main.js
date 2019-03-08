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
  const modulesCode = Object.keys(modules)
    .map(key => {
      const _module = modules[key]
      return `${_module.id}: ${_module.code}`
    })
    .join(',\n')

  return `;(function(modules) {
  var cache = {}
  function requireESModule(id) {
    if (cache[id]) {
      return cache[id]
    }
    var esModule = modules[id]
    var esModuleExports = {}
    esModule(requireESModule, esModuleExports)
    cache[id] = esModuleExports
    return esModuleExports
  }
  modules[0](requireESModule, {})
})({${modulesCode}})`
}

const wrapModule = code => {
  return `function(__requireESModule, __esModuleExports) {
  ${code}
}`
}

const compile = () => {
  const config = getConfig()
  const { entry, output } = config
  /**
   * module {
   *   id: number
   *   code: string
   * }
   * {
   *   [filePath: string]: module
   * }
   */
  const modules = {}
  let moduleId = -1

  const resolveImport = filePath => {
    if (modules[filePath]) {
      return modules[filePath].id
    }
    const rawModuleCode = readCodeFile(filePath)
    const currentId = ++moduleId
    modules[filePath] = {
      id: currentId,
      code: wrapModule(transformModule(rawModuleCode)),
    }
    return currentId
  }

  const resolveRelPath = relPath => {
    return path.resolve(entry, '../', relPath)
  }

  const transformModule = moduleCode => {
    const ast = parser.parse(moduleCode, {
      sourceType: 'module',
    })

    traverse(ast, {
      ImportDeclaration(path, stats) {
        const varName = path.node.specifiers[0].local.name
        const relPath = path.node.source.value
        // TODO: ext 处理
        const moduleId = resolveImport(resolveRelPath(relPath + '.js'))
        const code = `var ${varName} = __requireESModule(${moduleId}).default`
        const importNode = babel.template.statement.ast`${code}`
        path.replaceWith(importNode)
      },
      ExportDefaultDeclaration(path, stats) {
        // TODO: 暂时简单处理，明显这边还可以是其他的形式
        const defaultVarName = path.node.declaration.name
        const importNode = babel.template.statement
          .ast`__esModuleExports.default = ${defaultVarName}`
        path.replaceWith(importNode)
      },
    })

    // @ts-ignore
    const { code: codeOutput } = babel.transformFromAstSync(ast)
    return codeOutput
  }

  resolveImport(entry)
  const finalCode = codeTpl(modules)
  writeCodeToDisk(path.resolve(output, './bundle.js'), finalCode)
  console.log('Build complete 🌟')
}

compile()
