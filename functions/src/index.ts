import * as admin from 'firebase-admin';
import { uploadEmployeeCSV } from './csv/employee';
import { uploadSalaryCSV } from './csv/salary';
import { uploadStandardRemunerationCSV } from './csv/standard-remuneration';
// import { onSalaryCreated, onSalaryUpdated } from './premiums/salary-triggers-premiums';

console.log('=== Functions初期化開始 ===');

// Firebase Admin SDKの初期化
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'kensyu10097',
    storageBucket: 'kensyu10097.firebasestorage.app'
  });
}

console.log('Admin SDK初期化完了');

export {
  uploadEmployeeCSV,
  uploadSalaryCSV,
  uploadStandardRemunerationCSV,
  // onSalaryCreated,
  // onSalaryUpdated
};