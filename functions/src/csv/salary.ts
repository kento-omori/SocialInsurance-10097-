import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { parse } from 'csv-parse/sync';
import { Response } from 'express';
import cors from 'cors';

const corsHandler = cors({
  origin: ['http://localhost:4200', 'https://kensyu10097.web.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
});

// 給与データの型定義
interface SalaryData {
  '社員番号': string;
  '支給年月': string;
  '支払基礎日数': number;
  '給与種類': string;
  '昇給等情報': string;
  '非固定賃金変更': string;
  '支給額(通貨)': number;
  '支給額(現物)': number;
  '支給総額': number;
  '社会保険算定対象総額': number;
  '社会保険非対象額': number;
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
const validateSalaryData = async (data: SalaryData[], companyId: string): Promise<ValidationResult> => {
  const errors: string[] = [];
  
  // 有効な値の定義
  const validSalaryTypes = ['給与', '賞与'];
  const validFixedSalaryChanges = ['変更なし', '昇給', '降給'];
  const validNonFixedSalaryChanges = ['変更なし', '変更あり'];

  // 支給年月のフォーマットチェック（YYYY-MM）
  const dateFormatRegex = /^\d{4}-\d{2}$/;

  // 数値チェック用の正規表現（半角数字のみ）
  const numberRegex = /^[0-9]+$/;

  // 必須フィールドとフォーマットのチェック
  data.forEach((salary, index) => {
    // 必須フィールドチェック
    const requiredFields = [
      '社員番号', 
      '支給年月', '支払基礎日数', '給与種類', '昇給等情報', 
      '非固定賃金変更', '支給額(通貨)', '支給額(現物)',
      '社会保険算定対象総額', '支給額(社会保険非対象)', '支給総額'
    ];

    requiredFields.forEach(field => {
      if (!salary[field] && salary[field] !== 0) {
        errors.push(`行${index + 1}: ${field}が入力されていません`);
      }
    });

    // 支給年月のフォーマットチェック
    if (salary['支給年月'] && !dateFormatRegex.test(salary['支給年月'])) {
      errors.push(`行${index + 1}: 支給年月はYYYY-MM形式で入力してください`);
    }

    // 支払基礎日数の数値チェック
    const paymentDays = Number(salary['支払基礎日数']);
    if (isNaN(paymentDays) || paymentDays < 0 || paymentDays > 31) {
      errors.push(`行${index + 1}: 支払基礎日数は0から31の間で入力してください`);
    }
    if (!numberRegex.test(String(salary['支払基礎日数']))) {
      errors.push(`行${index + 1}: 支払基礎日数は半角数字で入力してください`);
    }

    // 給与種類の有効性チェック
    if (salary['給与種類'] && !validSalaryTypes.includes(salary['給与種類'])) {
      errors.push(`行${index + 1}: 給与種類「${salary['給与種類']}」は無効な値です`);
    }

    // 昇給等情報の有効性チェック
    if (salary['昇給等情報'] && !validFixedSalaryChanges.includes(salary['昇給等情報'])) {
      errors.push(`行${index + 1}: 昇給等情報「${salary['昇給等情報']}」は無効な値です`);
    }

    // 非固定賃金変更の有効性チェック
    if (salary['非固定賃金変更'] && !validNonFixedSalaryChanges.includes(salary['非固定賃金変更'])) {
      errors.push(`行${index + 1}: 非固定賃金変更「${salary['非固定賃金変更']}」は無効な値です`);
    }

    // 金額の数値チェック
    const currencyAmount = Number(salary['支給額(通貨)']);
    const nonCurrencyAmount = Number(salary['支給額(現物)']);
    const socialInsuranceTotalAmount = Number(salary['社会保険算定対象総額']);
    const nonSocialInsuranceAmount = Number(salary['支給額(社会保険非対象)']);
    const totalAmount = Number(salary['支給総額']);

    // 半角数字チェック
    if (!numberRegex.test(String(salary['支給額(通貨)']))) {
      errors.push(`行${index + 1}: 支給額(通貨)は半角数字で入力してください`);
    }
    if (!numberRegex.test(String(salary['支給額(現物)']))) {
      errors.push(`行${index + 1}: 支給額(現物)は半角数字で入力してください`);
    }
    if (!numberRegex.test(String(salary['社会保険算定対象総額']))) {
      errors.push(`行${index + 1}: 社会保険算定対象総額は半角数字で入力してください`);
    }
    if (!numberRegex.test(String(salary['支給額(社会保険非対象)']))) {
      errors.push(`行${index + 1}: 支給額(社会保険非対象)は半角数字で入力してください`);
    }
    if (!numberRegex.test(String(salary['支給総額']))) {
        errors.push(`行${index + 1}: 支給総額は半角数字で入力してください`);
    }

    // 0以上の数値チェック
    if (isNaN(currencyAmount) || currencyAmount < 0) {
      errors.push(`行${index + 1}: 支給額(通貨)は0以上の数値で入力してください`);
    }
    if (isNaN(nonCurrencyAmount) || nonCurrencyAmount < 0) {
      errors.push(`行${index + 1}: 支給額(現物)は0以上の数値で入力してください`);
    }
    if (isNaN(socialInsuranceTotalAmount) || socialInsuranceTotalAmount < 0) {
      errors.push(`行${index + 1}: 社会保険算定対象総額は0以上の数値で入力してください`);
    }
    if (isNaN(nonSocialInsuranceAmount) || nonSocialInsuranceAmount < 0) {
      errors.push(`行${index + 1}: 支給額(社会保険非対象)は0以上の数値で入力してください`);
    }
    if (isNaN(totalAmount) || totalAmount < 0) {
      errors.push(`行${index + 1}: 支給総額は0以上の数値で入力してください`);
    }

    // 支給総額の合計チェック
    if (currencyAmount + nonCurrencyAmount !== socialInsuranceTotalAmount) {
      errors.push(`行${index + 1}: 社会保険算定対象総額が支給額(通貨)と支給額(現物)の合計と一致しません`);
    }
    if (socialInsuranceTotalAmount + nonSocialInsuranceAmount !== totalAmount) {
        errors.push(`行${index + 1}: 支給総額が社会保険算定対象総額と支給額(社会保険非対象)の合計と一致しません`);
    }
  });

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // 社員番号の存在チェック
  const employeeIds = new Set(data.map(salary => salary['社員番号']));
  const existingEmployees = await admin.firestore()
    .collection('companies')
    .doc(companyId)
    .collection('employees')
    .where('employeeId', 'in', Array.from(employeeIds))
    .get();

  const existingEmployeeIds = new Set(
    existingEmployees.docs.map(doc => doc.data().employeeId)
  );

  data.forEach((salary, index) => {
    if (!existingEmployeeIds.has(salary['社員番号'])) {
      errors.push(`行${index + 1}: 社員番号 ${salary['社員番号']} は存在しません`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

// 給与と賞与を判別する関数
const determinePaymentType = (data: SalaryData): 'salary' | 'bonus' => {
  // 給与種類で判別
  if (data['給与種類'] === '賞与') {
    return 'bonus';
  }
  // 給与種類が未指定の場合は、支給額の特徴で判別
  if (data['給与種類'] === '給与' || !data['給与種類']) {
    return 'salary';
  }
  // デフォルトは給与として扱う
  return 'salary';
}

export const uploadSalaryCSV = functions.https.onRequest(async (req: functions.https.Request, res: Response) => {
  return corsHandler(req, res, async () => {
    try {
      console.log('リクエスト受信:', req.body);  // リクエストの内容をログ出力
      const { companyId, companyName, csvData } = req.body;
      
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
        console.log('パースされたデータ:', parsedData);  // パースされたデータをログ出力
      } catch (error) {
        console.error('CSVのパースに失敗:', error);
        res.status(400).json({
          success: false,
        });
        return;
      }

      // バリデーション
      const validationResult = await validateSalaryData(parsedData, companyId);
      if (!validationResult.isValid) {
        console.error('バリデーションエラー:', validationResult.errors);  // バリデーションエラーをログ出力
        res.status(400).json({
          success: false,
          message: validationResult.errors.join('\n'),
          details: validationResult.errors  // エラーの詳細を追加
        });
        return;
      }

      // 給与と賞与を分類
      const salaryData: SalaryData[] = [];
      const bonusData: SalaryData[] = [];
      
      for (const data of parsedData) {
        const paymentType = determinePaymentType(data);
        if (paymentType === 'salary') {
          salaryData.push(data);
        } else {
          bonusData.push(data);
        }
      }
      
      // 給与データの処理
      if (salaryData.length > 0) {
        await processSalaryData(companyId, companyName, salaryData);
      }

      // 賞与データの処理
      if (bonusData.length > 0) {
        await processBonusData(companyId, companyName, bonusData);
      }

      res.json({
        success: true,
        message: '保存が完了しました',
        count: {
          salary: salaryData.length,
          bonus: bonusData.length
        }      
      });

    } catch (error: any) {
      console.error('予期せぬエラー:', error);
      res.status(500).json({
        success: false,
        message: error.message || '予期せぬエラーが発生しました',
      });
    }
  });
});

// 給与データの処理
async function processSalaryData(companyId: string, companyName: string, salaryData: SalaryData[]): Promise<void> {
  const batch = admin.firestore().batch();
  
  for (const salary of salaryData) {
    // 従業員情報の取得
    const employeeDoc = await admin.firestore()
      .collection('companies')
      .doc(companyId)
      .collection('employees')
      .doc(salary['社員番号'])
      .get();

    if (!employeeDoc.exists) {
      throw new Error(`社員番号 ${salary['社員番号']} の従業員情報が見つかりません`);
    }
    const employeeData = employeeDoc.data();
    if (!employeeData) {
      throw new Error(`社員番号 ${salary['社員番号']} の従業員データが不正です`);
    }

    // 既存の給与情報を検索
    const existingSalaryQuery = await admin.firestore()
      .collection('companies')
      .doc(companyId)
      .collection('employees')
      .doc(salary['社員番号'])
      .collection('salaryInfo')
      .where('paymentDate', '==', salary['支給年月'])
      .where('salaryType', '==', salary['給与種類'])
      .get();

    const salaryData = {
      employeeId: salary['社員番号'],
      employeeName: `${employeeData.lastName}　${employeeData.firstName}`,
      employeeAttribute: employeeData.employeeAttribute,
      qualification: employeeData.insuredStatus ? 
        (employeeData.insuredStatus.includes('health') && employeeData.insuredStatus.includes('pension') ? '健保・厚生' :
         employeeData.insuredStatus.includes('health') ? '健保' :
         employeeData.insuredStatus.includes('pension') ? '厚生' : 'なし') : 'なし',
      paymentDate: salary['支給年月'],
      paymentDays: Number(salary['支払基礎日数']),
      salaryType: salary['給与種類'],
      fixedSalaryChange: salary['昇給等情報'],
      nonFixedSalaryChange: salary['非固定賃金変更'],
      currencyAmount: Number(salary['支給額(通貨)']),
      nonCurrencyAmount: Number(salary['支給額(現物)']),
      socialInsuranceTotalAmount: Number(salary['社会保険算定対象総額']),
      nonSocialInsuranceAmount: Number(salary['支給額(社会保険非対象)']),
      totalAmount: Number(salary['支給総額']),
      companyId,
      companyName,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!existingSalaryQuery.empty) {
      // 既存データがある場合は更新
      const existingDoc = existingSalaryQuery.docs[0];
      batch.update(existingDoc.ref, {
        ...salaryData,
        updatedAt: new Date()
      });
    } else {
      console.log('新規データとして追加');
      // 新規データの場合は追加
      const docRef = admin.firestore()
        .collection('companies')
        .doc(companyId)
        .collection('employees')
        .doc(salary['社員番号'])
        .collection('salaryInfo')
        .doc();
      
      batch.set(docRef, {
        ...salaryData,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  await batch.commit();
}

// 賞与データの処理
async function processBonusData(companyId: string, companyName: string, bonusData: SalaryData[]): Promise<void> {
  const batch = admin.firestore().batch();
  
  for (const bonus of bonusData) {
    // 従業員情報の取得
    const employeeDoc = await admin.firestore()
      .collection('companies')
      .doc(companyId)
      .collection('employees')
      .doc(bonus['社員番号'])
      .get();

    if (!employeeDoc.exists) {
      throw new Error(`社員番号 ${bonus['社員番号']} の従業員情報が見つかりません`);
    }
    const employeeData = employeeDoc.data();
    if (!employeeData) {
      throw new Error(`社員番号 ${bonus['社員番号']} の従業員データが不正です`);
    }

    // 標準報酬賞与額の計算（社会保険算定対象総額の1000円未満を切り捨て）
    const socialInsuranceTotalAmount = Number(bonus['社会保険算定対象総額']);
    const standardBonusAmount = Math.floor(socialInsuranceTotalAmount / 1000) * 1000;

    // 既存の賞与情報を検索
    const existingBonusQuery = await admin.firestore()
      .collection('companies')
      .doc(companyId)
      .collection('employees')
      .doc(bonus['社員番号'])
      .collection('salaryInfo')
      .where('paymentDate', '==', bonus['支給年月'])
      .where('salaryType', '==', bonus['給与種類'])
      .get();

    const bonusData = {
      employeeId: bonus['社員番号'],
      employeeName: `${employeeData.lastName}　${employeeData.firstName}`,
      employeeAttribute: employeeData.employeeAttribute,
      qualification: employeeData.insuredStatus ? 
        (employeeData.insuredStatus.includes('health') && employeeData.insuredStatus.includes('pension') ? '健保・厚生' :
         employeeData.insuredStatus.includes('health') ? '健保' :
         employeeData.insuredStatus.includes('pension') ? '厚生' : 'なし') : 'なし',
      paymentDate: bonus['支給年月'],
      paymentDays: Number(bonus['支払基礎日数']),
      salaryType: bonus['給与種類'],
      fixedSalaryChange: bonus['昇給等情報'],
      nonFixedSalaryChange: bonus['非固定賃金変更'],
      currencyAmount: Number(bonus['支給額(通貨)']),
      nonCurrencyAmount: Number(bonus['支給額(現物)']),
      socialInsuranceTotalAmount: Number(bonus['社会保険算定対象総額']),
      nonSocialInsuranceAmount: Number(bonus['支給額(社会保険非対象)']),
      totalAmount: Number(bonus['支給総額']),
      companyId,
      companyName
    };

    if (!existingBonusQuery.empty) {
      // 既存データがある場合は更新
      const existingDoc = existingBonusQuery.docs[0];
      batch.update(existingDoc.ref, {
        ...bonusData,
        updatedAt: new Date()
      });
    } else {
      // 新規データの場合は追加
      const docRef = admin.firestore()
        .collection('companies')
        .doc(companyId)
        .collection('employees')
        .doc(bonus['社員番号'])
        .collection('salaryInfo')
        .doc();
      
      batch.set(docRef, {
        ...bonusData,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // 標準報酬賞与額の情報を保存
    // 既存の標準報酬賞与額情報を検索
    const existingStandardRemunerationQuery = await admin.firestore()
      .collection('companies')
      .doc(companyId)
      .collection('employees')
      .doc(bonus['社員番号'])
      .collection('standardRemuneration')
      .where('standardRemunerationDate', '==', bonus['支給年月'])
      .where('salaryType', '==', bonus['給与種類'])
      .get();

    const standardRemunerationData = {
      employeeId: bonus['社員番号'],
      employeeName: `${employeeData.lastName}　${employeeData.firstName}`,
      employeeAttribute: employeeData.employeeAttribute,
      qualification: employeeData.insuredStatus ? 
        (employeeData.insuredStatus.includes('health') && employeeData.insuredStatus.includes('pension') ? '健保・厚生' :
         employeeData.insuredStatus.includes('health') ? '健保' :
         employeeData.insuredStatus.includes('pension') ? '厚生' : 'なし') : 'なし',
      salaryType: bonus['給与種類'],
      standardRemuneration: standardBonusAmount,
      standardRemunerationDate: bonus['支給年月'],
      companyId
    };

    if (!existingStandardRemunerationQuery.empty) {
      // 既存データがある場合は更新
      const existingDoc = existingStandardRemunerationQuery.docs[0];
      batch.update(existingDoc.ref, {
        ...standardRemunerationData,
        updatedAt: new Date()
      });
    } else {
      // 新規データの場合は追加
      const standardRemunerationRef = admin.firestore()
        .collection('companies')
        .doc(companyId)
        .collection('employees')
        .doc(bonus['社員番号'])
        .collection('standardRemuneration')
        .doc();
      
      batch.set(standardRemunerationRef, {
        ...standardRemunerationData,
        id: standardRemunerationRef.id,
        createdAt: new Date()
      });
    }
  }

  await batch.commit();
}
