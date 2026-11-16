// JSON / multipart client for the /api endpoints.
export async function api(path, { method = 'GET', body, form } = {}) {
  const opts = { method, headers: {}, credentials: 'same-origin' };
  if (form) opts.body = form;
  else if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }

  let res;
  try { res = await fetch('/api' + path, opts); }
  catch { throw Object.assign(new Error('Cannot reach the server. Please check your connection and try again.'), { status: 0 }); }

  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status; err.data = data;
    throw err;
  }
  return data;
}
