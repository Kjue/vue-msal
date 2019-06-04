import { AuthenticationContext } from './authentication-context'
import { AxiosAuthHttp } from './axios-http.js'

let authenticationContext = null

const MsalPlugin = {
  install (vue, opts = {}) {
    authenticationContext = new AuthenticationContext(opts)
    vue.prototype.$msal = authenticationContext

    vue.mixin({
      data () {
        return {
          authenticated: false
        }
      },

      computed: {
        isAuthenticated () {
          this.authenticated = this.$msal.isAuthenticated()
          return this.authenticated
        }
      }
    })
  }
}

export default MsalPlugin
export { authenticationContext as AuthenticationContext, AxiosAuthHttp }
