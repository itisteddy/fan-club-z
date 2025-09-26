import{r as p,g as b,R as h}from"./vendor-2237fdcd.js";import"./ui-7ef4368a.js";const C=e=>{let t;const n=new Set,r=(s,a)=>{const _=typeof s=="function"?s(t):s;if(!Object.is(_,t)){const E=t;t=a??(typeof _!="object"||_===null)?_:Object.assign({},t,_),n.forEach(I=>I(t,E))}},o=()=>t,l={setState:r,getState:o,getInitialState:()=>S,subscribe:s=>(n.add(s),()=>n.delete(s)),destroy:()=>{n.clear()}},S=t=e(r,o,l);return l},F=e=>e?C(e):C;var A={exports:{}},m={},D={exports:{}},O={};/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var c=p;function N(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var Z=typeof Object.is=="function"?Object.is:N,y=c.useState,v=c.useEffect,U=c.useLayoutEffect,M=c.useDebugValue;function P(e,t){var n=t(),r=y({inst:{value:n,getSnapshot:t}}),o=r[0].inst,u=r[1];return U(function(){o.value=n,o.getSnapshot=t,f(o)&&u({inst:o})},[e,n,t]),v(function(){return f(o)&&u({inst:o}),e(function(){f(o)&&u({inst:o})})},[e]),M(n),n}function f(e){var t=e.getSnapshot;e=e.value;try{var n=t();return!Z(e,n)}catch{return!0}}function z(e,t){return t()}var L=typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"?z:P;O.useSyncExternalStore=c.useSyncExternalStore!==void 0?c.useSyncExternalStore:L;D.exports=O;var w=D.exports;/**
 * @license React
 * use-sync-external-store-shim/with-selector.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var T=p,g=w;function B(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var J=typeof Object.is=="function"?Object.is:B,Y=g.useSyncExternalStore,j=T.useRef,H=T.useEffect,G=T.useMemo,k=T.useDebugValue;m.useSyncExternalStoreWithSelector=function(e,t,n,r,o){var u=j(null);if(u.current===null){var i={hasValue:!1,value:null};u.current=i}else i=u.current;u=G(function(){function l(E){if(!S){if(S=!0,s=E,E=r(E),o!==void 0&&i.hasValue){var I=i.value;if(o(I,E))return a=I}return a=E}if(I=a,J(s,E))return I;var d=r(E);return o!==void 0&&o(I,d)?(s=E,I):(s=E,a=d)}var S=!1,s,a,_=n===void 0?null:n;return[function(){return l(t())},_===null?void 0:function(){return l(_())}]},[t,n,r,o]);var V=Y(e,u[0],u[1]);return H(function(){i.hasValue=!0,i.value=V},[V]),k(V),V};A.exports=m;var $=A.exports;const W=b($),{useDebugValue:x}=h,{useSyncExternalStoreWithSelector:X}=W;const K=e=>e;function Q(e,t=K,n){const r=X(e.subscribe,e.getState,e.getServerState||e.getInitialState,t,n);return x(r),r}const R=e=>{const t=typeof e=="function"?F(e):e,n=(r,o)=>Q(t,r,o);return Object.assign(n,t),n},te=e=>e?R(e):R;export{te as c,w as s};
