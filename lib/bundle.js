'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var Msal = require('msal');

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var AuthenticationContext = function () {
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
  function AuthenticationContext(opts) {
    var _this2 = this;

    classCallCheck(this, AuthenticationContext);

    // Initialization to options or default
    this.config = opts.config || {
      clientId: 'your aad application client id',
      cacheLocation: 'localStorage',
      tenant: null,
      redirectUri: 'base uri for this application',
      graphScopes: ['user.read']
    };
    this.applicationConfig = {
      auth: {
        clientId: this.config.clientId,
        redirectUri: this.config.redirectUri,
        authority: !this.config.tenant ? 'https://login.microsoftonline.com/' + this.config.tenant : undefined
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
    };
    this.requireAuthOnInitialize = opts.requireAuthOnInitialize;

    // if (window.location.hostname !== '127.0.0.1') {
    //   redirectUri = PROD_REDIRECT_URI;
    // }

    this.msalContext = new Msal.UserAgentApplication(this.applicationConfig);

    this.msalContext.handleRedirectCallback(this.authRedirectCallback);
    // this.msalContext.handleAuthenticationResponse(this.authResponseCallback);


    // this.adalContext = opts.adalContext || new AdalContext(this.config)

    // if (this.adalContext.isCallback(window.location.hash) || window !== window.parent) {
    //   // This was a redirect from a login attempt
    //   this.adalContext.handleWindowCallback()
    // } else {
    //   var user = this.adalContext.getCachedUser()
    //   if (user && window.parent === window && !window.opener) {
    //     this.user = user
    //   } else if (this.requireAuthOnInitialize) {
    //     this.login()
    //   }
    // }

    if (this.requireAuthOnInitialize) {
      this.acquireToken(opts.config.clientId, function (err, token) {
        if (err) {
          console.log('Could not get token');
        }
      });
      if (this.config.graphScopes) {
        Object.keys(this.config.graphScopes).forEach(function (key, index) {
          var resource = this.config.graphScopes[key];
          this.acquireToken(resource, function (err, token) {
            if (err) {
              console.log('Could not get token');
            }
          });
        });
      }
    }

    if (opts.router) {
      // Initialize the router hooks
      opts.router.beforeEach(function (to, from, next) {
        if (opts.globalAuth || to.matched.some(function (record) {
          return record.meta.requireAuth;
        })) {
          if (_this2.isAuthenticated()) {
            // Authenticated, make sure roles are okay
            var checkRoles = [];
            if (to.matched.some(function (record) {
              if (record.meta.requireRoles) {
                checkRoles = checkRoles.concat(record.meta.requireRoles);
                return true;
              }
              return false;
            })) {
              if (_this2.checkRoles(checkRoles)) {
                // Authorized to see the page
                next();
              } else {
                // Not authorized to see page
                console.log('Not Authorized');
                next(from.fullPath);
              }
            } else {
              next();
            }
          } else {
            _this2.login();
          }
        } else {
          next();
        }
      });
    }
  }

  /**
   * Handles authentication redirect callback function for error and response.
   * @param {Object} error 
   * @param {Object} response 
   */


  createClass(AuthenticationContext, [{
    key: 'authRedirectCallback',
    value: function authRedirectCallback(error, response) {
      if (error) {
        console.error(error);
      }
      if (response) {
        console.log(response);
      }
    }

    /**
     * Handles authentication response callback function for error and response.
     * @param {Object} error 
     * @param {Object} response 
     */

  }, {
    key: 'authResponseCallback',
    value: function authResponseCallback(error, response) {
      if (error) {
        console.error(error);
      }
      if (response) {
        console.log(response);
      }
    }

    /**
     * Initiates the login process by redirecting the user to Azure AD authorization endpoint.
     * @memberof AuthenticationContext
     */

  }, {
    key: 'login',
    value: function login() {
      this.acquireToken();
    }

    /**
     * Redirects user to logout endpoint.
     * After logout, it will redirect to postLogoutRedirectUri if added as a property on the config object.
     * @memberof AuthenticationContext
     */

  }, {
    key: 'logout',
    value: function logout() {
      this.msalContext.logOut();
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

  }, {
    key: 'acquireToken',
    value: function acquireToken(resource, callback) {
      var _this3 = this;

      var _this = this;
      return this.msalContext.acquireTokenSilent({
        scopes: this.applicationConfig.graphScopes,
        account: this.applicationConfig.auth.clientId
      }).then(function (authResponse) {
        _this.user = authResponse.account;
        if (callback) callback(null, authResponse.accessToken);
      }, function (error) {
        console.log(error);
        return _this.msalContext.loginPopup({
          account: _this3.applicationConfig.auth.clientId
        }).then(function (authResponse) {
          _this.user = authResponse.account;
          if (callback) callback(null, authResponse.accessToken);
        }, function (err) {
          if (callback) callback(err);else console.error(err);
        });
      });
    }

    /**
      * Acquires token (interactive flow using a redirect) by sending request to AAD to obtain a new token. In this case the callback passed in the Authentication
      * request constructor will be called.
      * @param {string}   resource  ResourceUri identifying the target resource
      * @param {string}   extraQueryParameters  extraQueryParameters to add to the authentication request
      * @memberof AuthenticationContext
      */

  }, {
    key: 'acquireTokenRedirect',
    value: function acquireTokenRedirect(resource, extraQueryParameters) {
      // TODO: Fix or leave.
      this.msalContext.acquireTokenRedirect(resource, extraQueryParameters);
    }
  }, {
    key: 'getResourceForEndpoint',
    value: function getResourceForEndpoint(endpoint) {
      // TODO: Fix or leave.
      return this.msalContext.getScopesForEndpoint(endpoint);
    }
  }, {
    key: 'isAuthenticated',
    value: function isAuthenticated() {
      var authenticated = !!this.msalContext.getAccount();
      return authenticated;
    }
  }, {
    key: 'checkRoles',
    value: function checkRoles(roles) {
      // TODO: Fix or leave.
      if (!this.isAuthenticated()) {
        return false;
      }
      var account = this.msalContext.getAccount();
      if (!account || !account.idToken || !account.idToken.roles) {
        return false;
      }
      if (typeof roles === 'string') {
        roles = [roles];
      }

      for (var i = 0; i < roles.length; i++) {
        if (account.idToken.roles.indexOf(roles[i]) > -1) {
          return true;
        }
      }

      return false;
    }
  }, {
    key: 'clearCacheForScope',
    value: function clearCacheForScope(scope) {
      if (!this.isAuthenticated()) {
        return false;
      }
      this.msalContext.clearCacheForScope(scope);
    }
  }]);
  return AuthenticationContext;
}();

var getToken = function getToken(resource, http, cb) {
  AuthenticationContext.acquireToken(resource, function (err, token) {
    if (err) {
      var errCode = err.split(':')[0];
      switch (errCode) {
        case 'AADSTS50058':
          // Need to prompt for user sign in
          AuthenticationContext.login();
          break;
        case 'AADSTS65001':
          // Token is invalid; grab a new one
          // TODO: Fix or leave.
          AuthenticationContext.acquireTokenRedirect(resource);
          break;
        case 'AADSTS16000': // No Access
        default:
          // Need a pop-up forcing a login
          AuthenticationContext.login();
          break;
      }
      cb(new Error('Failed to acquire token'));
      return;
    }
    http.defaults.headers['Authorization'] = 'BEARER ' + token;
    cb(null, token);
  });
};

var AxiosAuthHttp = function () {
  function AxiosAuthHttp() {
    classCallCheck(this, AxiosAuthHttp);
  }

  createClass(AxiosAuthHttp, null, [{
    key: 'createNewClient',
    value: function createNewClient(options) {
      if (options == null) {
        throw new Error('Provided options for auth-http are null!');
      }
      if (options.axios == null) {
        throw new Error('options.axios is required to generate a new http client');
      }
      if (options.resourceId == null) {
        throw new Error('options.resourceId is required to acquire an auth token');
      }

      var axios = options.axios;
      var http = axios.create({
        baseURL: options.baseUrl,
        headers: {
          Authorization: null
        }
      });

      http.interceptors.response.use(function (response) {
        return response;
      }, function (error) {
        if (error.response.status === 401) {
          AuthenticationContext.clearCacheForScope(options.resourceId);
          return new Promise(function (resolve, reject) {
            return getToken(options.resourceId, http, function () {
              var config = error.response.config;
              config.headers.Authorization = http.defaults.headers['Authorization'];
              http({
                method: config.method,
                url: config.url,
                data: config.data,
                headers: {
                  'Accept': config.headers['Accept'],
                  'Authorization': config.headers['Authorization'],
                  'Content-Type': config.headers['Content-Type']
                }
              }).then(function (res) {
                return resolve(res);
              }, function (err) {
                return reject(err);
              });
            });
          });
        } else {
          return Promise.reject(error);
        }
      });

      if (options.router == null) {
        return http;
      }

      // Set up the router hooks for this resource
      options.router.beforeEach(function (to, from, next) {
        getToken(options.resourceId, http, function (err, token) {
          if (err) {
            if (options.onTokenFailure instanceof Function) {
              options.onTokenFailure(err);
            }
            next();
            return;
          }
          if (options.onTokenSuccess instanceof Function) {
            options.onTokenSuccess(http, AuthenticationContext, token);
          }
          next();
        });
      });
      return http;
    }
  }]);
  return AxiosAuthHttp;
}();

exports.AuthenticationContext = null;

var MsalPlugin = {
  install: function install(vue) {
    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    exports.AuthenticationContext = new AuthenticationContext(opts);
    vue.prototype.$msal = exports.AuthenticationContext;

    vue.mixin({
      data: function data() {
        return {
          authenticated: false
        };
      },


      computed: {
        isAuthenticated: function isAuthenticated() {
          this.authenticated = this.$msal.isAuthenticated();
          return this.authenticated;
        }
      }
    });
  }
};

exports.default = MsalPlugin;
exports.AxiosAuthHttp = AxiosAuthHttp;
