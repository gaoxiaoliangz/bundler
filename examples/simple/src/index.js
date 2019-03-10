import render from './render'
import { APP_NAME, APP_DESC } from './const'
import { withTag } from './utils/index'
import { runTests } from './tests'

const title = withTag('h1')
const div = withTag('div')

const app = () => {
  render(title([APP_NAME, APP_DESC].join(' - ')))
  render(div('app is running...'))
  runTests()
}

app()
