import showInfo from './showInfo'
import { APP_NAME, APP_DESC } from './const'

const app = () => {
  showInfo([APP_NAME, APP_DESC].join(' - '), 'h1')
  showInfo('app is running...')
  import('./lib/remote').then(m => {
    console.log(m)
  })
}

app()
