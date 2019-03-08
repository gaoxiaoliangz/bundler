import utils from './utils/index'

const showInfo = msg => {
  document.body.innerHTML = `<h1>${utils.add('Hi', msg)}</h1>`
}

export default showInfo
