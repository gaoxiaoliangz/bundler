import { add } from './utils/index'
import log from './utils/log'

const showInfo = (msg, tag = 'div') => {
  document.body.innerHTML += `<${tag}>${add('Hi', msg)}</${tag}>`
  log('working')
}

export default showInfo
