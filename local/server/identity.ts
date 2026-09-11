import {AsyncLocalStorage} from 'node:async_hooks';
export type LocalIdentity={userId:string;email:string;displayName:string};
export const identityContext=new AsyncLocalStorage<LocalIdentity|null>();
// Adapter replaces ChatGPT identity only in the local server bundle.
export async function getChatGPTUser(){return identityContext.getStore()??null}
