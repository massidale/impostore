import {createRequire} from 'node:module';
import {after} from 'node:test';
import {loadServer} from './serverLoader.ts';
const require=createRequire(import.meta.url);
const {initializeApp,deleteApp}=require('firebase/app');
const {getAuth,connectAuthEmulator,signInAnonymously}=require('firebase/auth');
const {getDatabase,connectDatabaseEmulator,goOffline}=require('firebase/database');
const {createSparkTransport}=loadServer('src/core/services/sparkTransport.ts');
const clients=[];
after(async()=>{await Promise.all(clients.map(async({app,db})=>{goOffline(db);await deleteApp(app);}));});
export async function newSparkUser(){
 const app=initializeApp({apiKey:'fake',projectId:'demo-gameshub',databaseURL:'https://demo-gameshub-default-rtdb.firebaseio.com'},'test-'+Math.random());
 const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
 const db=getDatabase(app);connectDatabaseEmulator(db,'127.0.0.1',9000);
 clients.push({app,db});await signInAnonymously(auth);
 return {uid:auth.currentUser.uid,token:await auth.currentUser.getIdToken(),transport:createSparkTransport(db,()=>auth.currentUser?.uid??null),db};
}
