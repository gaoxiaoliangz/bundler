import * as testExport from './utils/testExport'
import testExport2 from './utils/testExport2'
import log from './utils/log'

// TODO: 如果写成 export const runTests = () => { import(...).then(...) },
// dynamic import 不会被处理
const runTests = () => {
  log('testExport', testExport)
  log('testExport2', testExport2)

  // test dynamic import
  // import(log).then(a => {})
  import('./lib/remote').then(m => {
    m.test()
  })
  import('./lib/remote').then(m => {
    m.test()
  })
  import('./lib/remote2').then(m => {
    m.test2()
  })
}

export { runTests }
