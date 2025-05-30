import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { parse } from 'csv-parse/sync';
import { Response } from 'express';
import cors from 'cors';
import { InsuranceData, GradeEntry } from '../shared/insurance-data.service';

const corsHandler = cors({
  origin: ['http://localhost:4200', 'https://kensyu10097.web.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
});

// 標準報酬月額データの型定義
interface StandardRemunerationData {
  '社員番号': string;
  '報酬種類': string;
  '標準報酬額': number;
  '標準報酬適用年月': string;
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
const validateStandardRemunerationData = async (data: StandardRemunerationData[], companyId: string): Promise<ValidationResult> => {
  const errors: string[] = [];

  // 支給年月のフォーマットチェック（YYYY-MM）
  const dateFormatRegex = /^\d{4}-\d{2}$/;

  // 数値チェック用の正規表現（半角数字のみ）
  const numberRegex = /^[0-9]+$/;

  // 必須フィールドとフォーマットのチェック
  data.forEach((remuneration, index) => {
    // 必須フィールドチェック
    const requiredFields = [
      '社員番号',
      '報酬種類',
      '標準報酬額',
      '標準報酬適用年月'
    ];

    requiredFields.forEach(field => {
      if (!remuneration[field] && remuneration[field] !== 0) {
        errors.push(`行${index + 1}: ${field}が入力されていません`);
      }
    });

    // 標準報酬月額適用年月のフォーマットチェック
    if (remuneration['標準報酬適用年月'] && !dateFormatRegex.test(remuneration['標準報酬適用年月'])) {
      errors.push(`行${index + 1}: 標準報酬適用年月はYYYY-MM形式で入力してください`);
    }

    // 標準報酬月額の数値チェック
    const standardRemuneration = Number(remuneration['標準報酬額']);
    if (isNaN(standardRemuneration) || standardRemuneration < 0) {
      errors.push(`行${index + 1}: 標準報酬額は0以上の数値で入力してください`);
    }
    if (!numberRegex.test(String(remuneration['標準報酬額']))) {
      errors.push(`行${index + 1}: 標準報酬額は半角数字で入力してください`);
    }

    // 報酬種類のバリデーション
    if (remuneration['報酬種類'] !== '月額' && remuneration['報酬種類'] !== '賞与') {
      errors.push(`行${index + 1}: 報酬種類は「月額」または「賞与」のみ入力可能です`);
    }

    // 賞与の場合、1,000円未満が切り捨てられた数字かチェック
    if (remuneration['報酬種類'] === '賞与') {
      const standardRemuneration = Number(remuneration['標準報酬額']);
      if (standardRemuneration % 1000 !== 0) {
        errors.push(`行${index + 1}: 賞与の標準報酬額は1,000円未満を切り捨てた金額で入力してください`);
      }
    }

    // 標準報酬月額が等級テーブルに存在するかチェック（月額の場合のみ）
    if (remuneration['報酬種類'] === '月額') {
      const grade = InsuranceData.getGradeTable().find((g: GradeEntry) => g.standardMonthlyRemuneration === standardRemuneration);
      if (!grade) {
        errors.push(`行${index + 1}: 標準報酬額 ${standardRemuneration} は等級テーブルに存在しません`);
      }
    }
  });

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // 社員番号の存在チェック
  const employeeIds = new Set(data.map(remuneration => remuneration['社員番号']));
  const existingEmployees = await admin.firestore()
    .collection('companies')
    .doc(companyId)
    .collection('employees')
    .where('employeeId', 'in', Array.from(employeeIds))
    .get();

  const existingEmployeeIds = new Set(
    existingEmployees.docs.map(doc => doc.data().employeeId)
  );

  data.forEach((remuneration, index) => {
    if (!existingEmployeeIds.has(remuneration['社員番号'])) {
      errors.push(`行${index + 1}: 社員番号 ${remuneration['社員番号']} は存在しません`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const uploadStandardRemunerationCSV = functions.https.onRequest(async (req: functions.https.Request, res: Response) => {
  return corsHandler(req, res, async () => {
    try {
      console.log('リクエスト受信:', req.body);
      const { companyId, csvData } = req.body;
      
      if (!csvData) {
        console.error('CSVデータが提供されていません');
        res.status(400).json({
          success: false,
          message: 'CSVデータが提供されていません'
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
          message: 'CSVのパースに失敗しました'
        });
        return;
      }

      // バリデーション
      const validationResult = await validateStandardRemunerationData(parsedData, companyId);
      if (!validationResult.isValid) {
        console.error('バリデーションエラー:', validationResult.errors);
        res.status(400).json({
          success: false,
          message: validationResult.errors.join('\n'),
          details: validationResult.errors
        });
        return;
      }

      // Firestoreへの保存
      const batch = admin.firestore().batch();

      for (const remuneration of parsedData) {
        // 従業員情報の取得
        const employeeDoc = await admin.firestore()
          .collection('companies')
          .doc(companyId)
          .collection('employees')
          .doc(remuneration['社員番号'])
          .get();

        if (!employeeDoc.exists) {
          throw new Error(`社員番号 ${remuneration['社員番号']} の従業員情報が見つかりません`);
        }

        const employeeData = employeeDoc.data();
        if (!employeeData) {
          throw new Error(`社員番号 ${remuneration['社員番号']} の従業員データが不正です`);
        }

        // 標準報酬月額から等級を取得
        const standardRemuneration = Number(remuneration['標準報酬額']);
        let grade;
        if (remuneration['報酬種類'] === '月額') {
          grade = InsuranceData.getGradeTable().find((g: GradeEntry) => g.standardMonthlyRemuneration === standardRemuneration);
          if (!grade) {
            throw new Error(`標準報酬額 ${standardRemuneration} に対応する等級が見つかりません`);
          }
        }

        // 既存の標準報酬情報を検索
        const existingRemunerationQuery = await admin.firestore()
          .collection('companies')
          .doc(companyId)
          .collection('employees')
          .doc(remuneration['社員番号'])
          .collection('standardRemuneration')
          .where('salaryType', '==', remuneration['報酬種類'])
          .where('standardRemunerationDate', '==', remuneration['標準報酬適用年月'])
          .get();

        const remunerationData = {
          employeeId: remuneration['社員番号'],
          employeeName: `${employeeData.lastName}　${employeeData.firstName}`,
          employeeAttribute: employeeData.employeeAttribute,
          qualification: employeeData.insuredStatus ? 
            (employeeData.insuredStatus.includes('health') && employeeData.insuredStatus.includes('pension') ? '健保・厚生' :
             employeeData.insuredStatus.includes('health') ? '健保' :
             employeeData.insuredStatus.includes('pension') ? '厚生' : 'なし') : 'なし',
          salaryType: remuneration['報酬種類'],
          standardRemuneration: standardRemuneration,
          standardRemunerationGrade: grade?.grade || '',
          standardRemunerationDate: remuneration['標準報酬適用年月'],
          companyId
        };

        if (!existingRemunerationQuery.empty) {
          // 既存データがある場合は更新
          const existingDoc = existingRemunerationQuery.docs[0];
          batch.update(existingDoc.ref, {
            ...remunerationData,
            updatedAt: new Date()
          });
        } else {
          console.log('新規データとして追加');
          // 新規データの場合は追加
          const docRef = admin.firestore()
            .collection('companies')
            .doc(companyId)
            .collection('employees')
            .doc(remuneration['社員番号'])
            .collection('standardRemuneration')
            .doc();
          
          batch.set(docRef, {
            ...remunerationData,
            createdAt: new Date()
          });
        }
      }

      await batch.commit();
      res.json({
        success: true,
        message: '保存が完了しました',
        count: parsedData.length
      });

    } catch (error: any) {
      console.error('予期せぬエラー:', error);
      res.status(500).json({
        success: false,
        message: error.message || '予期せぬエラーが発生しました',
        details: error
      });
    }
  });
});
