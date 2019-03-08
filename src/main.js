// @ts-check
import * as parser from '@babel/parser'
import traverse from '@babel/traverse'
import * as babel from '@babel/core'
import * as path from 'path'
import * as fs from 'fs'
import generate from '@babel/generator'

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

const resolveRelPath = (relPath, currentPath) => {
  return path.resolve(currentPath, '../', relPath)
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
      code: wrapModule(transformModule(rawModuleCode, filePath)),
    }
    return currentId
  }

  const transformModule = (moduleCode, currentPath) => {
    const ast = parser.parse(moduleCode, {
      sourceType: 'module',
    })
    const makeExport = (local, exported = 'default') =>
      `__esModuleExports.${exported} = ${local}`
    const makeImport = (local, imported, _moduleId) => {
      return `var ${local} = __requireESModule(${_moduleId}).${imported ||
        'default'}`
    }
    const replaceWithCode = (path, code) => {
      const node = babel.template.statement.ast`${code}`
      path.replaceWith(node)
    }

    traverse(ast, {
      ImportDeclaration(path, stats) {
        const relPath = path.node.source.value
        // TODO: ext 处理
        const _moduleId = resolveImport(
          resolveRelPath(relPath + '.js', currentPath)
        )
        const imports = path.node.specifiers
          .map(s => {
            return makeImport(
              s.local.name,
              s.imported && s.imported.name,
              _moduleId
            )
          })
          .join(';\n')
        replaceWithCode(path, imports)
      },
      ExportDefaultDeclaration(path, stats) {
        if (path.node.declaration.type === 'Identifier') {
          const defaultVarName = path.node.declaration.name
          const importNode = babel.template.statement.ast`${makeExport(
            defaultVarName
          )}`
          path.replaceWith(importNode)
        } else {
          const { code: rCode } = generate(path.node.declaration)
          const code = makeExport(rCode)
          replaceWithCode(path, code)
        }
      },
      ExportNamedDeclaration(path, stats) {
        const _exports = path.node.specifiers
          .map(s => {
            return makeExport(s.local.name, s.exported.name)
          })
          .join(';\n')
        replaceWithCode(path, _exports)
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
