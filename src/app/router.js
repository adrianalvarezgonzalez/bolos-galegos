const routes = {};
let currentRoute = null;

export function registerRoute(path, handler) {
  routes[path] = handler;
}

export function navigate(path) {
  window.location.hash = path;
}

export function getCurrentRoute() {
  return currentRoute;
}

export function initRouter() {
  window.addEventListener('hashchange', handleRouteChange);
  handleRouteChange();
}

function handleRouteChange() {
  const hash = window.location.hash.slice(1) || '/';
  const prevRoute = currentRoute;
  currentRoute = hash;

  const app = document.getElementById('app');
  if (app && prevRoute !== null) {
    app.classList.remove('screen-enter');
    void app.offsetWidth;
    app.classList.add('screen-enter');
  }

  const handler = routes[hash];
  if (handler) {
    handler();
    return;
  }

  for (const [path, routeHandler] of Object.entries(routes)) {
    if (path.includes(':')) {
      const regex = new RegExp('^' + path.replace(/:([^/]+)/g, '([^/]+)') + '$');
      const match = hash.match(regex);
      if (match) {
        routeHandler(...match.slice(1));
        return;
      }
    }
  }

  const fallback = routes['/'];
  if (fallback) fallback();
}
