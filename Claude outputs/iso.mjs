import 'dotenv/config';
import { tenantContext, resolveConfig, configStore } from '../src/tenants.js';
Object.assign(configStore,{id:'x',baseUrl:'https://default'});
const run=(t,ms)=>tenantContext.run({tenant:t},async()=>{await new Promise(r=>setTimeout(r,ms));return [t,resolveConfig().baseUrl];});
console.log(await Promise.all([run('asiacell-prod',30),run('haier-dev',10),run('ooredoo-dev',20),run(undefined,5)]));
