import * as admin from 'firebase-admin';
import { processEmployeeCSV } from './csv/employee';

admin.initializeApp();

export {
  processEmployeeCSV
};