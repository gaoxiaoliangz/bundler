import { add } from './utils/index'

const showInfo = (msg, tag = 'div') => {
  document.body.innerHTML += `<${tag}>${add('Hi', msg)}</${tag}>`
}

export default showInfo
