// returns the cookie with the given name,
// or undefined if not found
function get(param) {
    let matches = document.cookie.match(new RegExp(
    "(?:^|; )" + param.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
}

// Example of use:
// setCookie('user', 'John', {secure: true, 'max-age': 3600});
function set(param, value, options = {}) {
    options = {
        path: '/',
        // add other defaults here if necessary
        // domain=site.com, by default a cookie is visible on current domain only, if set explicitly to the domain, makes the cookie visible on subdomains.
        // expires or max-age sets cookie expiration time, without them the cookie dies when the browser is closed.
        // secure makes the cookie HTTPS-only.
        // samesite forbids the browser to send the cookie with requests coming from outside the site, helps to prevent XSRF attacks.
        ...options
    };

    if (options.expires instanceof Date) {
        options.expires = options.expires.toUTCString();
    }

    let updatedCookie = encodeURIComponent(param) + "=" + encodeURIComponent(value);

    for (let optionKey in options) {
        updatedCookie += "; " + optionKey;
        let optionValue = options[optionKey];
        if (optionValue !== true) {
            updatedCookie += "=" + optionValue;
        }
    }

    document.cookie = updatedCookie;
}

function remove(param) {
    this.set(param, "", {
    'max-age': -1
    })
}

const cookie = {
    set: set,
    get: get
}

export default cookie