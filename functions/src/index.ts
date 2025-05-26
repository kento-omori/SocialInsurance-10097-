import * as admin from 'firebase-admin';
import { uploadEmployeeCSV } from './csv/employee';
import { uploadSalaryCSV } from './csv/salary';

// Firebase Admin SDKの初期化
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'kensyu10097',
    storageBucket: 'kensyu10097.firebasestorage.app'
  });
}

export {
  uploadEmployeeCSV,
  uploadSalaryCSV
};