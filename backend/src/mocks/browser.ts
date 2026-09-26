import {setupWorker} from 'msw/browser';
import {handlers} from './handlers';
import {startSideEffectAdvancer} from './domain/side-effects';

// 集中化副作用推进器：模拟服务端调度/渠道异步回调，取代散落在各 handler 的浏览器闭包 setTimeout。
startSideEffectAdvancer();

export const worker = setupWorker(...handlers);
