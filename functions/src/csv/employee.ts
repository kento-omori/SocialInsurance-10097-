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
  '氏': string;
  '名': string;
  '氏カナ': string;
  '名カナ': string;
  '和暦': string;
  '年': string;
  '月': string;
  '日': string;
  '性別': string;
  '社員属性': string;
  '健康保険': string;
  '厚生年金': string;
  '所属事業所': string;
  '部署': string;
  '役職': string;
  '入社和暦': string;
  '入社年': string;
  '入社月': string;
  '入社日': string;
  '退職和暦': string;
  '退職年': string;
  '退職月': string;
  '退職日': string;
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

// 和暦の定義
const eraList = [
  { value: '昭和', startYear: 1926, endYear: 1989, maxYear: 64 },
  { value: '平成', startYear: 1989, endYear: 2019, maxYear: 31 },
  { value: '令和', startYear: 2019, endYear: 9999, maxYear: 20 }
];

// 和暦を西暦に変換
const convertToWesternYear = (era: string, year: number): number => {
  const selectedEra = eraList.find(e => e.value === era);
  if (selectedEra) {
    return selectedEra.startYear + year - 1;
  }
  return 0;
};

// 日付の妥当性チェック
const validateDate = (era: string, year: string, month: string, day: string): boolean => {
  const selectedEra = eraList.find(e => e.value === era);
  if (!selectedEra) return false;

  const yearNum = parseInt(year);
  const monthNum = parseInt(month);
  const dayNum = parseInt(day);

  if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum)) return false;
  if (yearNum < 1 || yearNum > selectedEra.maxYear) return false;
  if (monthNum < 1 || monthNum > 12) return false;

  const westernYear = convertToWesternYear(era, yearNum);
  const daysInMonth = new Date(westernYear, monthNum, 0).getDate();
  return dayNum >= 1 && dayNum <= daysInMonth;
};

// 日付の比較
const compareDates = (era1: string, year1: string, month1: string, day1: string,
                     era2: string, year2: string, month2: string, day2: string): number => {
  const westernYear1 = convertToWesternYear(era1, parseInt(year1));
  const westernYear2 = convertToWesternYear(era2, parseInt(year2));
  
  const date1 = new Date(westernYear1, parseInt(month1) - 1, parseInt(day1));
  const date2 = new Date(westernYear2, parseInt(month2) - 1, parseInt(day2));
  
  return date1.getTime() - date2.getTime();
};

// バリデーションチェック
const validateEmployeeData = async (data: EmployeeData[], companyId: string): Promise<ValidationResult> => {
  const errors: string[] = [];
  const requiredFields = ['社員番号', '氏', '名', '氏カナ', '名カナ', '和暦', '年', '月', '日', '性別', '社員属性', '健康保険', '厚生年金', '所属事業所', '部署', '役職', '入社和暦', '入社年', '入社月', '入社日'];
  
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

  // 性別の有効な値のリスト
  const validGenders = ['男性', '女性'];

  // 必須フィールドのチェック
  data.forEach((employee, index) => {
    requiredFields.forEach(field => {
      if (!employee[field]) {
        errors.push(`行${index + 1}: ${field}が入力されていません`);
      }
    });

    // 氏名の全角文字チェック
    if (employee['氏'] && !/^[ぁ-んァ-ン一-龥々]+$/.test(employee['氏'])) {
      errors.push(`行${index + 1}: 氏は全角文字のみ使用可能です`);
    }
    if (employee['名'] && !/^[ぁ-んァ-ン一-龥々]+$/.test(employee['名'])) {
      errors.push(`行${index + 1}: 名は全角文字のみ使用可能です`);
    }

    // カナの全角カタカナチェック
    if (employee['氏カナ'] && !/^[ァ-ヶー]+$/.test(employee['氏カナ'])) {
      errors.push(`行${index + 1}: 氏カナは全角カタカナのみ使用可能です`);
    }
    if (employee['名カナ'] && !/^[ァ-ヶー]+$/.test(employee['名カナ'])) {
      errors.push(`行${index + 1}: 名カナは全角カタカナのみ使用可能です`);
    }

    // 社員属性の有効性チェック
    if (employee['社員属性'] && !validEmployeeAttributes.includes(employee['社員属性'])) {
      errors.push(`行${index + 1}: 社員属性「${employee['社員属性']}」は無効な値です`);
    }

    // 性別の有効性チェック
    if (employee['性別'] && !validGenders.includes(employee['性別'])) {
      errors.push(`行${index + 1}: 性別「${employee['性別']}」は無効な値です。有効な値は「男性」または「女性」です`);
    }

    // 日付のバリデーション
    if (!validateDate(employee['和暦'], employee['年'], employee['月'], employee['日'])) {
      errors.push(`行${index + 1}: 生年月日が正しくありません`);
    }

    // 入社日のバリデーション
    if (!validateDate(employee['入社和暦'], employee['入社年'], employee['入社月'], employee['入社日'])) {
      errors.push(`行${index + 1}: 入社日が正しくありません`);
    }

    // 退職日のバリデーション（入力がある場合のみ）
    if (employee['退職和暦'] && employee['退職年'] && employee['退職月'] && employee['退職日']) {
      if (!validateDate(employee['退職和暦'], employee['退職年'], employee['退職月'], employee['退職日'])) {
        errors.push(`行${index + 1}: 退職日が正しくありません`);
      }

      // 入社日と退職日の比較
      const comparison = compareDates(
        employee['入社和暦'], employee['入社年'], employee['入社月'], employee['入社日'],
        employee['退職和暦'], employee['退職年'], employee['退職月'], employee['退職日']
      );
      if (comparison > 0) {
        errors.push(`行${index + 1}: 退職日は入社日より後の日付を指定してください`);
      }
    }

    // 生年月日と入社日の比較
    const birthToHireComparison = compareDates(
      employee['和暦'], employee['年'], employee['月'], employee['日'],
      employee['入社和暦'], employee['入社年'], employee['入社月'], employee['入社日']
    );
    if (birthToHireComparison > 0) {
      errors.push(`行${index + 1}: 入社日は生年月日より後の日付を指定してください`);
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

// 事業所情報を取得する関数
const getOfficeInfo = async (companyId: string, officeName: string): Promise<{ id: string; officeName: string; prefecture: string; bulkApprovalType: string } | null> => {
  try {
    console.log('事業所情報取得開始:', { companyId, officeName });
    
    const officesSnapshot = await admin.firestore()
      .collection('companies')
      .doc(companyId)
      .collection('offices')
      .where('officeName', '==', officeName)
      .get();

    console.log('検索結果:', officesSnapshot.size, '件の事業所が見つかりました');

    if (!officesSnapshot.empty) {
      const officeDoc = officesSnapshot.docs[0];
      const officeData = officeDoc.data();
      console.log('取得した事業所情報:', officeData);

      return {
        id: officeDoc.id,  // ドキュメントIDを事業所IDとして使用
        officeName: officeData.officeName,
        prefecture: officeData.prefecture || '',
        bulkApprovalType: officeData.bulkApprovalType || ''
      };
    }

    console.log('事業所が見つかりませんでした');
    return null;
  } catch (error) {
    console.error('事業所情報の取得中にエラーが発生:', error);
    return null;
  }
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

        // 事業所情報の取得
        const officeInfo = await getOfficeInfo(companyId, employee['所属事業所']);
        console.log('従業員の事業所情報:', {
          employeeId: employee['社員番号'],
          officeName: employee['所属事業所'],
          officeInfo
        });

        batch.set(docRef, {
          employeeId: employee['社員番号'],
          lastName: employee['氏'],
          firstName: employee['名'],
          lastNameKana: employee['氏カナ'],
          firstNameKana: employee['名カナ'],
          birthEra: employee['和暦'],
          birthYear: employee['年'],
          birthMonth: employee['月'],
          birthDay: employee['日'],
          gender: employee['性別'],
          employeeAttribute: employee['社員属性'],
          companyId,
          companyName,
          insuredStatus,
          officeName: officeInfo?.officeName || employee['所属事業所'],
          office: officeInfo?.id || '',  // 事業所IDを設定
          prefecture: officeInfo?.prefecture || '',
          bulkApprovalType: officeInfo?.bulkApprovalType || '',
          rank: employee['役職'],
          department: employee['部署'],
          hireEra: employee['入社和暦'],
          hireYear: employee['入社年'],
          hireMonth: employee['入社月'],
          hireDay: employee['入社日'],
          retireEra: employee['退職和暦'] || '',
          retireYear: employee['退職年'] || '',
          retireMonth: employee['退職月'] || '',
          retireDay: employee['退職日'] || '',
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