;(function(modules) {
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
})({
  // entry
  0: function(__requireESModule, __esModuleExports) {
    var showInfo = __requireESModule(1).default

    const app = () => {
      showInfo('app running')
    }

    app()
  },
  1: function(__requireESModule, __esModule) {
    const showInfo = msg => {
      console.log(msg)
    }

    __esModule.default = showInfo
  },
})
