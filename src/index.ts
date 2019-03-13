// @ts-check
import * as parser from '@babel/parser'
import traverse from '@babel/traverse'
import * as babel from '@babel/core'
import * as path from 'path'
import * as fs from 'fs'
import generate from '@babel/generator'
import * as md5 from 'md5'

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

  return `;(function() {
  var __dynamicImport = (function() {
    var cache = {}
    return function (url) {
      const hit = cache[url]
      if (hit) {
        if(!hit.isFetching) {
          return Promise.resolve(cache[url].exports)
        } else {
          return hit.fetchPromise
        }
      }
      const fetchPromise = fetch(url).then(res => {
        return res.text().then(data => {
          const result = eval(data)
          cache[url] = {
            exports: result,
            isFetching: false,
          }
          return result
        })
      })
      cache[url] = {
        fetchPromise,
        isFetching: true,
        exports: null,
      }
      return fetchPromise
    }
  })()
  return (function(modules) {
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
    return requireESModule(0)
  })({${modulesCode}})
})()`
}

const wrapModule = (code, filePath) => {
  return `// ${filePath}
  function(__requireESModule, __esModuleExports) {
    ${code}
  }`
}

const resolveRelPath = (relPath, currentPath) => {
  return path.resolve(currentPath, '../', relPath)
}

const compileBundle = ({
  entry,
  output,
  compiledBundles,
  onFinishCompilingBundle,
  isAppBundle,
}) => {
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
      code: wrapModule(transformModule(rawModuleCode, filePath), filePath),
    }
    return currentId
  }

  const transformModule = (moduleCode, currentPath) => {
    const ast = parser.parse(moduleCode, {
      sourceType: 'module',
      plugins: ['dynamicImport'],
    })
    const makeExport = (local, exported = 'default') =>
      `__esModuleExports.${exported} = ${local}`
    const makeImport = (local, imported, _moduleId) => {
      if (imported === '*') {
        return `var ${local} = __requireESModule(${_moduleId})`
      }
      return `var ${local} = __requireESModule(${_moduleId}).${imported ||
        'default'}`
    }
    const replaceWithCode = (path, code) => {
      const node = babel.template.statement.ast`${code}`
      path.replaceWith(node)
    }

    traverse(ast, {
      // find import()
      ExpressionStatement(path) {
        path.traverse({
          CallExpression(path) {
            path.traverse({
              MemberExpression(path) {
                path.traverse({
                  CallExpression(path) {
                    if (path.node.callee.type === 'Import') {
                      path.node.callee.type = 'Identifier'
                      path.node.callee.name = '__dynamicImport'
                      const relPath = path.node.arguments[0].value
                      const absPath = resolveRelPath(
                        relPath + '.js',
                        currentPath
                      )
                      if (compiledBundles[absPath]) {
                        path.node.arguments[0].value =
                          compiledBundles[absPath].publicFilePath
                        return
                      }
                      const publicFilePath = compileBundle({
                        entry: absPath,
                        output: {
                          path: output.path,
                          publicPath: output.publicPath,
                        },
                        onFinishCompilingBundle,
                        compiledBundles,
                        isAppBundle: false,
                      })
                      path.node.arguments[0].value = publicFilePath
                    }
                  },
                })
              },
            })
          },
        })
      },
      ImportDeclaration(path, stats) {
        const relPath = path.node.source.value
        // TODO: ext 处理
        const _moduleId = resolveImport(
          resolveRelPath(relPath + '.js', currentPath)
        )
        const imports = path.node.specifiers
          .map(s => {
            if (s.type === 'ImportNamespaceSpecifier') {
              return makeImport(s.local.name, '*', _moduleId)
            }
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
          const { code } = generate(path.node.declaration)
          const exportCode = makeExport(code)
          replaceWithCode(path, exportCode)
        }
      },
      ExportNamedDeclaration(path, stats) {
        if (path.node.declaration) {
          const { code } = generate(path.node.declaration)
          const handleDecl = d => {
            const local = d.id.name
            return makeExport(local, local)
          }
          if (path.node.declaration.type === 'FunctionDeclaration') {
            replaceWithCode(
              path,
              code + '\n' + handleDecl(path.node.declaration)
            )
            return
          }
          let exportCode = ''
          path.node.declaration.declarations.forEach(d => {
            exportCode += handleDecl(d) + '\n'
          })
          replaceWithCode(path, code + '\n' + exportCode)
          return
        }
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
  const fileHash = md5(finalCode)
  let publicFilePath
  let filename

  if (isAppBundle) {
    // TODO: 处理 hash
    filename = output.filename || fileHash + '.js'
    publicFilePath = `${output.publicPath}/${filename}`
  } else {
    // dynamic import
    const {
      publicFilePath: publicFilePath0,
      filename: filename0,
    } = onFinishCompilingBundle(entry)
    filename = filename0
    publicFilePath = publicFilePath0
  }
  const outputFilePath = path.resolve(output.path, filename)

  if (!fs.existsSync(output.path)) {
    fs.mkdirSync(output.path)
  }
  writeCodeToDisk(outputFilePath, finalCode)
  console.log(`Bundled ${entry}`)
  return publicFilePath
}

const compile = () => {
  const config = getConfig()
  let bundleId = 0
  const { entry, output } = config
  /**
   * {
   *    [entryFilePath: string]: {
   *        id,
   *        publicFilePath,
   *    }
   * }
   */
  const compiledBundles = {}
  const onFinishCompilingBundle = filePath => {
    const id = bundleId
    const filename = `${id}.chunk.js`
    const publicFilePath = `${output.publicPath}/${filename}`
    const bundleInfo = {
      id,
      publicFilePath,
      filename,
    }
    bundleId++
    compiledBundles[filePath] = bundleInfo
    return bundleInfo
  }
  compileBundle({
    entry,
    output,
    compiledBundles,
    onFinishCompilingBundle,
    isAppBundle: true,
  })
  console.log('Build complete 🌟')
}

compile()
