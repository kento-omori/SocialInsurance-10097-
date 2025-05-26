import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { parse } from 'csv-parse/sync';
import { Response } from 'express';
import cors from 'cors';

const corsHandler = cors({
  origin: ['http://localhost:4200', 'https://kensyu10097.web.app'],  // Angular開発サーバーと本番環境のURL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
});

// 従業員データの型定義
interface EmployeeData {
  '社員番号': string;
  '従業員氏名': string;
  '社員属性': string;
  '健康保険': string;
  '厚生年金': string;
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

// 保険資格の文字列をbooleanに変換
const parseInsuranceStatus = (status: string): boolean => {
  const positiveValues = ['健康保険', '厚生年金', '○', 'はい', 'true', '1'];
  return positiveValues.includes(status);
};

// バリデーションチェック
const validateEmployeeData = async (data: EmployeeData[], companyId: string): Promise<ValidationResult> => {
  const errors: string[] = [];
  const requiredFields = ['社員番号', '従業員氏名', '社員属性'];
  
  // 社員属性の有効な値のリスト
  const validEmployeeAttributes = [
    '正社員',
    '常勤役員',
    '非常勤役員',
    '短時間就労者',
    '短時間労働者（社会保険加入）',
    '短時間労働者（社会保険非加入）',
    '派遣・フリーランス',
    'その他'
  ];

  // 必須フィールドのチェック
  data.forEach((employee, index) => {
    requiredFields.forEach(field => {
      if (!employee[field]) {
        errors.push(`行${index + 1}: ${field}が入力されていません`);
      }
    });

    // 従業員氏名の全角スペースチェック
    if (employee['従業員氏名']) {
      const name = employee['従業員氏名'];
      if (!/^[ぁ-んァ-ン一-龥々　]+$/.test(name)) {
        errors.push(`行${index + 1}: 従業員氏名は全角文字と全角スペースのみ使用可能です`);
      }
    }

    // 社員属性の有効性チェック
    if (employee['社員属性'] && !validEmployeeAttributes.includes(employee['社員属性'])) {
      errors.push(`行${index + 1}: 社員属性「${employee['社員属性']}」は無効な値です`);
    }
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

export const uploadEmployeeCSV = functions.https.onRequest(async (req: functions.https.Request, res: Response) => {
  return corsHandler(req, res, async () => {
    try {
      console.log('リクエスト受信:', req.body);
      const { companyId, companyName, csvData } = req.body;
      
      if (!csvData) {
        console.error('CSVデータが提供されていません');
        res.status(400).json({
          success: false,
          message: 'CSVデータが提供されていません'
        });
        return;
      }

      if (!companyId || !companyName) {
        console.error('会社情報が不足しています:', { companyId, companyName });
        res.status(400).json({
          success: false,
          message: '会社情報が不足しています'
        });
        return;
      }

      // CSVデータのパース
      let parsedData;
      try {
        parsedData = parseCSV(csvData);
        console.log('パースされたデータ:', parsedData);
      } catch (error) {
        console.error('CSVのパースに失敗:', error);
        res.status(400).json({
          success: false,
          message: 'CSVの形式が正しくありません'
        });
        return;
      }
      
      // バリデーション
      const validationResult = await validateEmployeeData(parsedData, companyId);
      if (!validationResult.isValid) {
        console.error('バリデーションエラー:', validationResult.errors);
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
        
        // 保険資格の設定
        const insuredStatus: string[] = [];
        if (parseInsuranceStatus(employee['健康保険'])) {
          insuredStatus.push('health');
        }
        if (parseInsuranceStatus(employee['厚生年金'])) {
          insuredStatus.push('pension');
        }

        batch.set(docRef, {
          employeeId: employee['社員番号'],
          employeeName: employee['従業員氏名'],
          employeeAttribute: employee['社員属性'],
          companyId,
          companyName,
          insuredStatus,
          enrolmentData: true,
          createdAt: new Date()
        });
      }

      try {
        await batch.commit();
        console.log('保存完了:', parsedData.length, '件のデータを保存');
        res.json({
          success: true,
          message: '保存が完了しました',
          count: parsedData.length
        });
      } catch (error) {
        console.error('Firestoreへの保存に失敗:', error);
        res.status(500).json({
          success: false,
          message: 'データの保存に失敗しました'
        });
      }
    } catch (error: any) {
      console.error('予期せぬエラー:', error);
      res.status(500).json({
        success: false,
        message: error.message || '予期せぬエラーが発生しました'
      });
    }
  });
});