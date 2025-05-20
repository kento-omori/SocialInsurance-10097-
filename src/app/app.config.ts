import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

import { provideFirebaseApp, initializeApp, getApp } from '@angular/fire/app';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { provideFirestore, getFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { provideStorage, getStorage, connectStorageEmulator } from '@angular/fire/storage';
import { provideMessaging, getMessaging } from '@angular/fire/messaging';
import { provideFunctions, getFunctions, connectFunctionsEmulator } from '@angular/fire/functions';
import { provideToastr } from 'ngx-toastr';

const firebaseConfig = {
  apiKey: "AIzaSyCwgWS2A4T-TtIN7mM1cdJeP6FoLYlvGBE",
  authDomain: "kensyu10097.firebaseapp.com",
  projectId: "kensyu10097",
  storageBucket: "kensyu10097.firebasestorage.app",
  messagingSenderId: "362602686023",
  appId: "1:362602686023:web:e60168bccb17906096f362",
  measurementId: "G-0DY53Q67GM"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideToastr({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
    }),
    provideFirebaseApp(() => {
      const app = initializeApp(firebaseConfig);
      
      // // 開発環境の場合のみエミュレーターを接続
      // if (window.location.hostname === "localhost") {
      //   const auth = getAuth(app);
      //   const db = getFirestore(app);
      //   const storage = getStorage(app);
      //   const functions = getFunctions(app, 'asia-northeast1');
        
      //   // Firestoreエミュレーターの接続
      //   connectFirestoreEmulator(db, 'localhost', 8080);
      //   // Authエミュレーターの接続
      //   connectAuthEmulator(auth, 'http://localhost:9099');
      //   // Storageエミュレーターの接続
      //   connectStorageEmulator(storage, "localhost", 9199);
      //   // Functionsエミュレーターの接続
      //   connectFunctionsEmulator(functions, 'localhost', 5001);
      // }
      return app;
    }),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore(getApp(),'socialinsurance')),
    provideStorage(() => getStorage()),
    provideMessaging(() => getMessaging()),
    provideFunctions(() => getFunctions()),
  ]
};
