import{r as v,g as O,R}from"./vendor-d7cd1423.js";import"./ui-3b2655eb.js";var V={exports:{}},h={};/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var E=v;function z(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var w=typeof Object.is=="function"?Object.is:z,D=E.useState,N=E.useEffect,U=E.useLayoutEffect,g=E.useDebugValue;function P(e,t){var n=t(),r=D({inst:{value:n,getSnapshot:t}}),o=r[0].inst,u=r[1];return U(function(){o.value=n,o.getSnapshot=t,m(o)&&u({inst:o})},[e,n,t]),N(function(){return m(o)&&u({inst:o}),e(function(){m(o)&&u({inst:o})})},[e]),g(n),n}function m(e){var t=e.getSnapshot;e=e.value;try{var n=t();return!w(e,n)}catch{return!0}}function J(e,t){return t()}var M=typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"?J:P;h.useSyncExternalStore=E.useSyncExternalStore!==void 0?E.useSyncExternalStore:M;V.exports=h;var Z=V.exports;const y=e=>{let t;const n=new Set,r=(s,f)=>{const c=typeof s=="function"?s(t):s;if(!Object.is(c,t)){const i=t;t=f??(typeof c!="object"||c===null)?c:Object.assign({},t,c),n.forEach(a=>a(t,i))}},o=()=>t,I={setState:r,getState:o,getInitialState:()=>p,subscribe:s=>(n.add(s),()=>n.delete(s)),destroy:()=>{n.clear()}},p=t=e(r,o,I);return I},j=e=>e?y(e):y;var A={exports:{}},T={};/**
 * @license React
 * use-sync-external-store-shim/with-selector.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var S=v,L=Z;function Y(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var C=typeof Object.is=="function"?Object.is:Y,G=L.useSyncExternalStore,B=S.useRef,k=S.useEffect,F=S.useMemo,$=S.useDebugValue;T.useSyncExternalStoreWithSelector=function(e,t,n,r,o){var u=B(null);if(u.current===null){var l={hasValue:!1,value:null};u.current=l}else l=u.current;u=F(function(){function I(i){if(!p){if(p=!0,s=i,i=r(i),o!==void 0&&l.hasValue){var a=l.value;if(o(a,i))return f=a}return f=i}if(a=f,C(s,i))return a;var b=r(i);return o!==void 0&&o(a,b)?(s=i,a):(s=i,f=b)}var p=!1,s,f,c=n===void 0?null:n;return[function(){return I(t())},c===null?void 0:function(){return I(c())}]},[t,n,r,o]);var d=G(e,u[0],u[1]);return k(function(){l.hasValue=!0,l.value=d},[d]),$(d),d};A.exports=T;var W=A.exports;const x=O(W),{useDebugValue:X}=R,{useSyncExternalStoreWithSelector:H}=x;const K=e=>e;function Q(e,t=K,n){const r=H(e.subscribe,e.getState,e.getServerState||e.getInitialState,t,n);return X(r),r}const _=e=>{const t=typeof e=="function"?j(e):e,n=(r,o)=>Q(t,r,o);return Object.assign(n,t),n},te=e=>e?_(e):_;export{te as c,Z as s};
