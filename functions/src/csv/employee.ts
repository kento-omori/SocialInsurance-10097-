import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { parse } from 'csv-parse/sync';
import { Response } from 'express';

// 従業員データの型定義
interface EmployeeData {
  '社員番号': string;
  '従業員氏名': string;
  '社員属性': string;
  [key: string]: any;
}

// バリデーション結果の型定義
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

const parseCSV = (csvString: string) => {
  return parse(csvString, {
    columns: true,
    skip_empty_lines: true
  });
};

// バリデーションチェック
const validateEmployeeData = async (data: EmployeeData[], companyId: string): Promise<ValidationResult> => {
  const errors: string[] = [];
  const requiredFields = ['社員番号', '従業員氏名', '社員属性'];
  
  // 必須フィールドのチェック
  data.forEach((employee, index) => {
    requiredFields.forEach(field => {
      if (!employee[field]) {
        errors.push(`行${index + 1}: ${field}が入力されていません`);
      }
    });
  });

  if (errors.length > 0) {
    return {
      isValid: false,
      errors
    };
  }

  // 社員番号の重複チェック（CSV内）
  const employeeIds = new Set<string>();
  data.forEach((employee, index) => {
    if (employeeIds.has(employee['社員番号'])) {
      errors.push(`行${index + 1}: 社員番号 ${employee['社員番号']} が重複しています`);
    }
    employeeIds.add(employee['社員番号']);
  });

  if (errors.length > 0) {
    return {
      isValid: false,
      errors
    };
  }

  // Firestoreとの重複チェック
  const existingEmployees = await admin.firestore()
    .collection('companies')
    .doc(companyId)
    .collection('employees')
    .where('employeeId', 'in', Array.from(employeeIds))
    .get();

  const existingEmployeeIds = new Set(
    existingEmployees.docs.map(doc => doc.data().employeeId)
  );

  data.forEach((employee, index) => {
    if (existingEmployeeIds.has(employee['社員番号'])) {
      errors.push(`行${index + 1}: 社員番号 ${employee['社員番号']} は既に登録されています`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const processEmployeeCSV = functions.https.onRequest(async (req: functions.https.Request, res: Response) => {
  try {
    const { companyId, companyName, csvData } = req.body;
    
    if (!csvData) {
      res.status(400).json({
        success: false,
        message: 'CSVデータが提供されていません'
      });
      return;
    }

    // CSVデータのパース
    const parsedData = parseCSV(csvData);
    
    // バリデーション
    const validationResult = await validateEmployeeData(parsedData, companyId);
    if (!validationResult.isValid) {
      res.status(400).json({
        success: false,
        message: validationResult.errors.join('\n')
      });
      return;
    }

    // Firestoreへの保存
    const batch = admin.firestore().batch();
    for (const employee of parsedData) {
      const docRef = admin.firestore()
        .collection('companies')
        .doc(companyId)
        .collection('employees')
        .doc(employee['社員番号']);
      
      batch.set(docRef, {
        employeeId: employee['社員番号'],
        employeeName: employee['従業員氏名'],
        employeeAttribute: employee['社員属性'],
        companyId,
        companyName,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    await batch.commit();

    res.json({
      success: true,
      message: '保存が完了しました',
      count: parsedData.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}); 