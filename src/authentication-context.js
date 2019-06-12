import * as Msal from 'msal';

class AuthenticationContext {
  /**
   * Configuration options for Adal Authentication Context.
   * @class config
   *  @property {string} tenant - Your target tenant.
   *  @property {string} clientId - Client ID assigned to your app by Azure Active Directory.
   *  @property {string} redirectUri - Endpoint at which you expect to receive tokens.Defaults to `window.location.href`.
   *  @property {string} instance - Azure Active Directory Instance.Defaults to `https://login.microsoftonline.com/`.
   *  @property {Array} graphScopes - An array of scopes to pre consent before login. Optional.
   *  @property {Boolean} popUp - Set this to true to enable login in a popup winodow instead of a full redirect.Defaults to `false`.
   *  @property {string} localLoginUrl - Set this to redirect the user to a custom login page.
   *  @property {function} displayCall - User defined function of handling the navigation to Azure AD authorization endpoint in case of login. Defaults to 'null'.
   *  @property {string} postLogoutRedirectUri - Redirects the user to postLogoutRedirectUri after logout. Defaults is 'redirectUri'.
   *  @property {string} cacheLocation - Sets browser storage to either 'localStorage' or sessionStorage'. Defaults to 'sessionStorage'.
   *  @property {Array.<string>} anonymousgraphScopes Array of keywords or URI's. Adal will not attach a token to outgoing requests that have these keywords or uri. Defaults to 'null'.
   *  @property {number} expireOffsetSeconds If the cached token is about to be expired in the expireOffsetSeconds (in seconds), Adal will renew the token instead of using the cached token. Defaults to 300 seconds.
   *  @property {string} correlationId Unique identifier used to map the request with the response. Defaults to RFC4122 version 4 guid (128 bits).
   *  @property {number} loadFrameTimeout The number of milliseconds of inactivity before a token renewal response from AAD should be considered timed out.
   */

  /**
   * Configuration options for Authentication Context.
   * @class options
   *  @property {config} config - Configuration options for Adal Authentication Context.
   *  @property {boolean} requireAuthOnInitialize - Perform authentication upon startup.
   *  @property {any} router - Configure the router with route hooks.
   */

  /**
   * Creates a new AuthenticationContext object.
   * @constructor
   * @param {options}  options - Configuration options for AuthenticationContext
   */
  constructor (opts) {
    // Initialization to options or default
    this.config = Object.assign({}, {
      clientId: 'your aad application client id',
      cacheLocation: 'localStorage',
      tenant: null,
      redirectUri: 'base uri for this application',
      graphScopes: ['user.read'],
      usePopup: true
    }, opts.config)

    // Leaving the options available to the library visible under comments intentionally to see what are available.
    this.applicationConfig = {
      auth: {
        clientId: this.config.clientId,
        redirectUri: this.config.redirectUri,
        authority: !this.config.tenant ? `https://login.microsoftonline.com/${this.config.tenant}` : 'https://login.microsoftonline.com/common'
        // validateAuthority?: boolean;
        // postLogoutRedirectUri?: string | (() => string);
        // navigateToLoginRequestUrl?: boolean;
      },
      cache: {
        cacheLocation: this.config.cacheLocation
        // storeAuthStateInCookie?: boolean;
      },
      graphScopes: !this.config.graphScopes ? ['user.read'] : this.config.graphScopes
      // system: {
      //   logger?: Logger;
      //   loadFrameTimeout?: number;
      //   tokenRenewalOffsetSeconds?: number;
      //   navigateFrameWait?: number;
      // },
      // framework: {
      //   isAngular?: boolean;
      //   unprotectedResources?: Array<string>;
      //   protectedResourceMap?: Map<string, Array<string>>;
      // }
    }
    this.requireAuthOnInitialize = opts.requireAuthOnInitialize

    // if (window.location.hostname !== '127.0.0.1') {
    //   redirectUri = PROD_REDIRECT_URI;
    // }

    this.msalContext = new Msal.UserAgentApplication(this.applicationConfig);

    this.msalContext.handleRedirectCallback(this.authRedirectCallback);
    // this.msalContext.handleAuthenticationResponse(this.authResponseCallback);


    if (this.requireAuthOnInitialize) {
      this.acquireToken(opts.config.clientId, (err, token) => {
        if (err) {
          console.log('Could not get token')
        }
      })
      if (this.config.graphScopes) {
        const _this = this
        Object.keys(this.config.graphScopes).forEach(function (key, index) {
          const resource = _this.config.graphScopes[key]
          _this.acquireToken(resource, (err, token) => {
            if (err) {
              console.log('Could not get token')
            }
          }).catch(reason => {
            console.log('Could not get token:', reason)
          })
        })
      }
    }

    if (opts.router) {
      // Initialize the router hooks
      opts.router.beforeEach((to, from, next) => {
        if (opts.globalAuth || to.matched.some(record => record.meta.requireAuth)) {
          if (this.isAuthenticated()) {
            // Authenticated, make sure roles are okay
            let checkRoles = []
            if (to.matched.some(record => {
              if (record.meta.requireRoles) {
                checkRoles = checkRoles.concat(record.meta.requireRoles)
                return true
              }
              return false
            })) {
              if (this.checkRoles(checkRoles)) {
                // Authorized to see the page
                next()
              } else {
                // Not authorized to see page
                console.log('Not Authorized')
                next(from.fullPath)
              }
            } else {
              next()
            }
          } else {
            this.login()
          }
        } else {
          next()
        }
      })
    }
  }

  /**
   * Handles authentication redirect callback function for error and response.
   * @param {Object} error 
   * @param {Object} response 
   */
  authRedirectCallback(error, response) {
    if (error) {
      console.error(error)
    }
    if (response) {
      console.log(response)
    }
  }

  /**
   * Handles authentication response callback function for error and response.
   * @param {Object} error 
   * @param {Object} response 
   */
  authResponseCallback(error, response) {
    if (error) {
      console.error(error)
    }
    if (response) {
      console.log(response)
    }
  }

  /**
   * Initiates the login process by redirecting the user to Azure AD authorization endpoint.
   * @memberof AuthenticationContext
   */
  login () {
    this.acquireToken()
  }

  /**
   * Redirects user to logout endpoint.
   * After logout, it will redirect to postLogoutRedirectUri if added as a property on the config object.
   * @memberof AuthenticationContext
   */
  logout () {
    this.msalContext.logOut()
  }

  /**
   * @callback tokenCallback
   * @param {string} error_description error description returned from AAD if token request fails.
   * @param {string} token token returned from AAD if token request is successful.
   * @param {string} error error message returned from AAD if token request fails.
   */

  /**
   * Acquires token from the cache if it is not expired. Otherwise sends request to AAD to obtain a new token.
   * @param {string}   resource  ResourceUri identifying the target resource
   * @param {tokenCallback} callback -  The callback provided by the caller. It will be called with token or error.
   * @memberof AuthenticationContext
   */
  acquireToken (resource, callback) {
    var _this = this
    return this.msalContext
      .acquireTokenSilent({
        scopes: this.applicationConfig.graphScopes,
        account: this.applicationConfig.auth.clientId,
        authority: this.applicationConfig.auth.authority
      })
      .then(authResponse => {
        _this.user = authResponse.account
        if (callback) callback(null, authResponse.accessToken)
      },
      error => {
        console.log(error)
        const opts = { account: this.applicationConfig.auth.clientId }
        const loginTask = this.config.usePopup
          ? _this.msalContext.loginPopup(opts)
          : _this.msalContext.loginRedirect(opts)

        loginTask.then(
            authResponse => {
              _this.user = authResponse.account
              if (callback) callback(null, authResponse.accessToken)
            },
            err => {
              if (callback) callback(err)
              else console.error(err)
            }
          );
      }
    );
  }

  /**
    * Acquires token (interactive flow using a redirect) by sending request to AAD to obtain a new token. In this case the callback passed in the Authentication
    * request constructor will be called.
    * @param {string}   resource  ResourceUri identifying the target resource
    * @param {string}   extraQueryParameters  extraQueryParameters to add to the authentication request
    * @memberof AuthenticationContext
    */
  acquireTokenRedirect (resource, extraQueryParameters) {
    // TODO: Fix or leave.
    this.msalContext.acquireTokenRedirect(resource, extraQueryParameters)
  }

  getResourceForEndpoint (endpoint) {
    // TODO: Fix or leave.
    return this.msalContext.getScopesForEndpoint(endpoint)
  }

  isAuthenticated () {
    const authenticated = !!this.msalContext.getAccount()
    return authenticated
  }

  checkRoles (roles) {
    // TODO: Fix or leave.
    if (!this.isAuthenticated()) {
      return false
    }
    var account = this.msalContext.getAccount()
    if (!account || !account.idToken || !account.idToken.roles) {
      return false
    }
    if (typeof roles === 'string') {
      roles = [roles]
    }

    for (let i = 0; i < roles.length; i++) {
      if (account.idToken.roles.indexOf(roles[i]) > -1) {
        return true
      }
    }

    return false
  }

  clearCacheForScope (scope) {
    if (!this.isAuthenticated()) {
      return false
    }
    this.msalContext.clearCacheForScope(scope)
  }
}

export { AuthenticationContext }
