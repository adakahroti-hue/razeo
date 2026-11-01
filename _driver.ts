
import handler from './api/auth/status.ts';
import logs from './api/logs.ts';

function mockRes() {
  const r: any = { statusCode: 200, body: null, headers: {},
    status(n:number){ r.statusCode = n; return r; },
    json(o:any){ r.body = o; return r; },
    send(o:any){ r.body = o; return r; } };
  return r;
}

async function main() {
  // tanpa token
  let res = mockRes();
  await handler({ method:'GET', headers:{}, query:{}, body:{} } as any, res);
  console.log('status tanpa token:', res.statusCode, JSON.stringify(res.body));

  // token palsu
  res = mockRes();
  await handler({ method:'GET', headers:{authorization:'Bearer tokenpalsu'}, query:{}, body:{} } as any, res);
  console.log('status token palsu:', res.statusCode, JSON.stringify(res.body));
}
main().catch(e => { console.error('DRIVER ERROR:', e); process.exit(1); });
