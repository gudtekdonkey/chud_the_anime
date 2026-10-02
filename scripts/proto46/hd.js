// imported first by main.js, before src/config.js reads ?hd: the page's 2x toggle is remembered here and turned into ?hd.
// Inside a sandboxed frame the history call may be refused; then the page simply stays at 1x.
try { if (localStorage.getItem('p46-hd') === '1' && !/[?&]hd/.test(location.search)) history.replaceState(null, '', location.pathname + '?hd' + location.hash); } catch (e) { /* stays 1x */ }
