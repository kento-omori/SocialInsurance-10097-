import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { InsuranceData } from '../shared/insurance-data.service';
import { Premiums, totalPremium } from '../shared/premiums';

// 型定義
interface EmployeeProfile {
  office: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  insuredStatus?: string[];
}

interface Office {
  id: string;
  prefecture: string;
  bulkApprovalType?: string;
  branchSelect?: string;
}

// 従業員情報を取得する関数
async function getEmployeeProfile(companyId: string, employeeId: string): Promise<EmployeeProfile> {
  console.log('従業員情報を取得開始:', companyId, employeeId);
  
  const employeeDoc = await admin.firestore()
    .collection('companies')
    .doc(companyId)
    .collection('employees')
    .doc(employeeId)
    .get();

  if (!employeeDoc.exists) {
    console.error('従業員情報が見つかりません:', companyId, employeeId);
    throw new Error('従業員情報が見つかりません');
  }

  const profile = employeeDoc.data() as EmployeeProfile;
  console.log('取得した従業員情報:', profile);
  return profile;
}

// 事業所情報を取得する関数
async function getOffices(companyId: string): Promise<Office[]> {
  console.log('事業所情報を取得開始:', companyId);
  
  const officesSnapshot = await admin.firestore()
    .collection('companies')
    .doc(companyId)
    .collection('offices')
    .get();

  if (officesSnapshot.empty) {
    console.error('事業所情報が見つかりません:', companyId);
    throw new Error('事業所情報が見つかりません');
  }

  const offices = officesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Office));

  console.log('取得した事業所情報:', offices);
  return offices;
}

// 端数処理（50銭以下は切り下げ、50銭より大きい場合は切り上げ）
function roundToNearestYen(amount: number): number {
  const decimal = amount - Math.floor(amount);
  if (decimal <= 0.5) {
    return Math.floor(amount);
  } else {
    return Math.ceil(amount);
  }
}

// 標準報酬月額を取得する関数
async function getStandardMonthlyRemuneration(companyId: string, employeeId: string) {
  const standardRemunerationSnapshot = await admin.firestore()
    .collection('companies')
    .doc(companyId)
    .collection('employees')
    .doc(employeeId)
    .collection('standardRemuneration')
    .get();

  if (standardRemunerationSnapshot.empty) {
    throw new Error('標準報酬月額の情報が見つかりません');
  }

  // 最新の標準報酬月額を取得　→　取得するものの要件をもっと細かくする
  const latestStandardRemuneration = standardRemunerationSnapshot.docs[0].data();
  return latestStandardRemuneration;
}

// 保険料計算関数
async function calculateInsurance(salaryData: any, standardRemuneration: any): Promise<Premiums> {
  // 従業員情報と事業所情報を取得
  const employeeProfile = await getEmployeeProfile(salaryData.companyId, salaryData.employeeId);
  const offices = await getOffices(salaryData.companyId);

  // 従業員の所属事業所を取得
  const employeeOffice = offices.find(o => o.id === employeeProfile.office);
  if (!employeeOffice) {
    console.error('従業員の所属事業所が見つかりません:', {
      employeeId: salaryData.employeeId,
      officeId: employeeProfile.office,
      availableOffices: offices.map(o => o.id)
    });
    throw new Error(`従業員の所属事業所（${employeeProfile.office}）が見つかりません`);
  }

  // 都道府県の決定
  let prefecture = employeeOffice.prefecture;
  
  // 一括適用承認の場合は本店の都道府県を使用
  if (employeeOffice.bulkApprovalType === '一括適用承認') {
    const mainOffice = offices.find(o => o.branchSelect === '本店');
    if (mainOffice?.prefecture) {
      prefecture = mainOffice.prefecture;
    }
  }

  // 保険料率を取得
  const rates = InsuranceData.getPrefectureRates().find(r => r.name === prefecture);
  if (!rates) {
    throw new Error(`${prefecture}の保険料率が見つかりません`);
  }

  // 年齢計算
  const birthDate = new Date(employeeProfile.birthYear, employeeProfile.birthMonth - 1, employeeProfile.birthDay);
  
  // 給与年月の末日を計算
  const [year, month] = salaryData.paymentDate.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const targetDate = new Date(year, month - 1, lastDay);
  
  let age = targetDate.getFullYear() - birthDate.getFullYear();
  if (targetDate.getMonth() < birthDate.getMonth() || (targetDate.getMonth() === birthDate.getMonth() && targetDate.getDate() < birthDate.getDate())) {
    age--;
  }

  // 対象判定
  const isKenpo = employeeProfile.insuredStatus?.includes('health');
  const isKosei = employeeProfile.insuredStatus?.includes('pension');
  const isKaigo = age >= 40 && age <= 64;
  const isKoseiTarget = isKosei && age < 70;
  const isKenpoTarget = isKenpo && age < 75;

  // 保険料計算
  let healthInsurancePremium = 0, nursingCarePremium = 0, pensionInsurancePremium = 0;
  let display_healthInsurancePremium = 0, display_nursingCarePremium = 0, display_pensionInsurancePremium = 0;
  let healthInsurancePremiumCompany = 0, nursingCarePremiumCompany = 0, pensionInsurancePremiumCompany = 0, childRearingContribution = 0;
  let display_healthInsurancePremiumCompany = 0, display_nursingCarePremiumCompany = 0, display_pensionInsurancePremiumCompany = 0, display_childRearingContribution = 0;

  if (isKenpoTarget) {
    // 健康保険料は労使折半
    const totalHealthInsurance = standardRemuneration.standardRemuneration * rates.healthInsuranceRate;
    healthInsurancePremium = totalHealthInsurance / 2; // 被保険者負担分
    display_healthInsurancePremium = roundToNearestYen(healthInsurancePremium); // 端数処理あり
    healthInsurancePremiumCompany = totalHealthInsurance / 2; // 事業主負担分
    display_healthInsurancePremiumCompany = roundToNearestYen(healthInsurancePremiumCompany); // 端数処理あり
  }

  if (isKaigo) {
    // 介護保険料は労使折半
    const totalNursingCare = standardRemuneration.standardRemuneration * rates.nursingCareRate;
    nursingCarePremium = totalNursingCare / 2; // 被保険者負担分
    display_nursingCarePremium = roundToNearestYen(nursingCarePremium); // 端数処理あり
    nursingCarePremiumCompany = totalNursingCare / 2; // 事業主負担分
    display_nursingCarePremiumCompany = roundToNearestYen(nursingCarePremiumCompany); // 端数処理あり
  }

  if (isKoseiTarget) {
    // 標準報酬月額の下限・上限処理
    let adjustedStandardRemuneration = standardRemuneration.standardRemuneration;
    if (adjustedStandardRemuneration < 88000) {
      adjustedStandardRemuneration = 88000;
    } else if (adjustedStandardRemuneration > 650000) {
      adjustedStandardRemuneration = 650000;
    }

    // 厚生年金保険料は労使折半
    const totalPension = adjustedStandardRemuneration * rates.pensionInsuranceRate;
    pensionInsurancePremium = totalPension / 2; // 被保険者負担分
    display_pensionInsurancePremium = roundToNearestYen(pensionInsurancePremium); // 端数処理あり
    pensionInsurancePremiumCompany = totalPension / 2; // 事業主負担分
    display_pensionInsurancePremiumCompany = roundToNearestYen(pensionInsurancePremiumCompany); // 端数処理あり
  }

  if (isKenpoTarget) {
    // 子ども子育て拠出金は全額事業主負担
    childRearingContribution = standardRemuneration.standardRemuneration * rates.childRearingContributionRate;
    display_childRearingContribution = roundToNearestYen(childRearingContribution); // 端数処理あり
  }

  // 合計計算
  const employeeShare = healthInsurancePremium + nursingCarePremium + pensionInsurancePremium;
  const display_employeeShare = display_healthInsurancePremium + display_nursingCarePremium + display_pensionInsurancePremium;

  const companyShare = healthInsurancePremiumCompany + nursingCarePremiumCompany + pensionInsurancePremiumCompany + childRearingContribution;
  const display_companyShare = display_healthInsurancePremiumCompany + display_nursingCarePremiumCompany + display_pensionInsurancePremiumCompany + display_childRearingContribution;

  const totalPremium = employeeShare + companyShare;
  const display_totalPremium = roundToNearestYen(totalPremium);

  // 対象外なら空欄でグレーアウト
  if (!isKenpo && !isKosei) {
    return {
      companyId: salaryData.companyId,
      companyName: '', // 会社名は後で設定
      employeeId: salaryData.employeeId,
      employeeName: '', // 従業員名は後で設定
      birthDate: '',
      age: 0,
      qualification: '',
      standardRemuneration: 0,
      standardRemunerationGrade: 0,
      standardRemunerationDate: '',
      healthInsurancePremium: null,
      nursingCarePremium: null,
      pensionInsurancePremium: null,
      employeeShare: null,
      healthInsurancePremiumCompany: null,
      nursingCarePremiumCompany: null,
      pensionInsurancePremiumCompany: null,
      childRearingContribution: null,
      companyShare: null,
      totalPremium: null,
      display_healthInsurancePremium: null,
      display_nursingCarePremium: null,
      display_pensionInsurancePremium: null,
      display_employeeShare: null,
      display_healthInsurancePremiumCompany: null,
      display_nursingCarePremiumCompany: null,
      display_pensionInsurancePremiumCompany: null,
      display_childRearingContribution: null,
      display_companyShare: null,
      display_totalPremium: null,
      paymentDate: salaryData.paymentDate,
      salaryType: salaryData.salaryType,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // 端数処理
  return {
    companyId: salaryData.companyId,
    companyName: '', // 会社名は後で設定
    employeeId: salaryData.employeeId,
    employeeName: '', // 従業員名は後で設定
    birthDate: '',
    age,
    qualification: '',
    standardRemuneration: standardRemuneration.standardRemuneration,
    standardRemunerationGrade: standardRemuneration.standardRemunerationGrade,
    standardRemunerationDate: standardRemuneration.standardRemunerationDate,
    healthInsurancePremium,
    nursingCarePremium,
    pensionInsurancePremium,
    employeeShare,
    healthInsurancePremiumCompany,
    nursingCarePremiumCompany,
    pensionInsurancePremiumCompany,
    childRearingContribution,
    companyShare,
    totalPremium,
    display_healthInsurancePremium,
    display_nursingCarePremium,
    display_pensionInsurancePremium,
    display_employeeShare,
    display_healthInsurancePremiumCompany,
    display_nursingCarePremiumCompany,
    display_pensionInsurancePremiumCompany,
    display_childRearingContribution,
    display_companyShare,
    display_totalPremium,
    paymentDate: salaryData.paymentDate,
    salaryType: salaryData.salaryType,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// 会社納付額の計算関数
async function calculateTotalPremiums(companyId: string, paymentDate: string, salaryType: string): Promise<totalPremium> {
  // 該当月の保険料情報を取得
  const premiumsSnapshot = await admin.firestore()
    .collection('companies')
    .doc(companyId)
    .collection('employees')
    .get();

  let totalPremiums: totalPremium = {
    totalHealthInsurance: 0,
    totalNursingCare: 0,
    totalPension: 0,
    totalEmployeeShare: 0,
    totalHealthInsuranceCompany: 0,
    totalNursingCareCompany: 0,
    totalPensionCompany: 0,
    totalChildRearing: 0,
    totalCompanyShare: 0,
    totalHealthAll: 0,
    totalNursingCareAll: 0,
    totalPensionAll: 0,
    totalChildRearingAll: 0,
    totalAll: 0,
    paymentDate: paymentDate,
    salaryType: salaryType,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // 各従業員の保険料を集計
  for (const employeeDoc of premiumsSnapshot.docs) {
    const premiumsQuery = await admin.firestore()
      .collection('companies')
      .doc(companyId)
      .collection('employees')
      .doc(employeeDoc.id)
      .collection('premiumsInfo')
      .where('paymentDate', '==', paymentDate)
      .where('salaryType', '==', salaryType)
      .get();

    if (!premiumsQuery.empty) {
      const premium = premiumsQuery.docs[0].data();
      
      // 従業員負担分
      if (premium.display_healthInsurancePremium !== null) {
        totalPremiums.totalHealthInsurance += premium.display_healthInsurancePremium;
        totalPremiums.totalHealthAll += premium.display_healthInsurancePremium;
      }
      if (premium.display_nursingCarePremium !== null) {
        totalPremiums.totalNursingCare += premium.display_nursingCarePremium;
        totalPremiums.totalNursingCareAll += premium.display_nursingCarePremium;
      }
      if (premium.display_pensionInsurancePremium !== null) {
        totalPremiums.totalPension += premium.display_pensionInsurancePremium;
        totalPremiums.totalPensionAll += premium.display_pensionInsurancePremium;
      }
      if (premium.display_employeeShare !== null) {
        totalPremiums.totalEmployeeShare += premium.display_employeeShare;
        totalPremiums.totalHealthAll += premium.display_employeeShare;
      }

      // 会社負担分
      if (premium.display_healthInsurancePremiumCompany !== null) {
        totalPremiums.totalHealthInsuranceCompany += premium.display_healthInsurancePremiumCompany;
        totalPremiums.totalHealthAll += premium.display_healthInsurancePremiumCompany;
      }
      if (premium.display_nursingCarePremiumCompany !== null) {
        totalPremiums.totalNursingCareCompany += premium.display_nursingCarePremiumCompany;
        totalPremiums.totalNursingCareAll += premium.display_nursingCarePremiumCompany;
      }
      if (premium.display_pensionInsurancePremiumCompany !== null) {
        totalPremiums.totalPensionCompany += premium.display_pensionInsurancePremiumCompany;
        totalPremiums.totalPensionAll += premium.display_pensionInsurancePremiumCompany;
      }
      if (premium.display_childRearingContribution !== null) {
        totalPremiums.totalChildRearing += premium.display_childRearingContribution;
        totalPremiums.totalChildRearingAll += premium.display_childRearingContribution;
      }

      // 合計額
      if (premium.display_healthInsurancePremium !== null && premium.display_healthInsurancePremiumCompany !== null) {
        totalPremiums.totalHealthAll += premium.display_healthInsurancePremium + premium.display_healthInsurancePremiumCompany;
      }
      if (premium.display_nursingCarePremium !== null && premium.display_nursingCarePremiumCompany !== null) {
        totalPremiums.totalNursingCareAll += premium.display_nursingCarePremium + premium.display_nursingCarePremiumCompany;
      }
      if (premium.display_pensionInsurancePremium !== null && premium.display_pensionInsurancePremiumCompany !== null) {
        totalPremiums.totalPensionAll += premium.display_pensionInsurancePremium + premium.display_pensionInsurancePremiumCompany;
      }
      if (premium.display_childRearingContribution !== null) {
        totalPremiums.totalChildRearingAll += premium.display_childRearingContribution;
      }
    }
  }

  // 会社負担合計
  totalPremiums.totalCompanyShare = totalPremiums.totalHealthInsuranceCompany + 
                                   totalPremiums.totalNursingCareCompany + 
                                   totalPremiums.totalPensionCompany + 
                                   totalPremiums.totalChildRearing;

  // 総額
  totalPremiums.totalAll = Math.floor(totalPremiums.totalHealthAll) + 
                          Math.floor(totalPremiums.totalNursingCareAll) + 
                          Math.floor(totalPremiums.totalPensionAll) + 
                          Math.floor(totalPremiums.totalChildRearingAll);

  return totalPremiums;
}

// 保険料計算の共通処理
async function processSalaryData(salaryData: any, companyId: string, employeeId: string, docRef: admin.firestore.DocumentReference) {
  try {
    // 既にエラー状態の場合は処理をスキップ
    if (salaryData.insuranceCalculationStatus === 'error') {
      console.log('既にエラー状態のため、処理をスキップします:', {
        companyId,
        employeeId,
        paymentDate: salaryData.paymentDate,
        salaryType: salaryData.salaryType
      });
      return null;
    }

    // 保険料計算に必要なデータを抽出
    const salaryRequairedData = {
      companyId: companyId,
      employeeId: employeeId,
      salaryType: salaryData.salaryType,
      paymentDate: salaryData.paymentDate,       
    }
    
    // 標準報酬月額の取得
    const standardRemuneration = await getStandardMonthlyRemuneration(companyId, employeeId);
    
    // 保険料計算
    const insuranceCalculation = await calculateInsurance(salaryRequairedData, standardRemuneration);

    // 既存の保険料情報を検索
    const existingPremiumQuery = await admin.firestore()
      .collection('companies')
      .doc(companyId)
      .collection('employees')
      .doc(employeeId)
      .collection('premiumsInfo')
      .where('paymentDate', '==', salaryData.paymentDate)
      .where('salaryType', '==', salaryData.salaryType)
      .get();

    if (!existingPremiumQuery.empty) {
      // 既存データがある場合は更新
      const existingDoc = existingPremiumQuery.docs[0];
      await existingDoc.ref.update({
        ...insuranceCalculation,
        updatedAt: admin.firestore.Timestamp.now()
      });
    } else {
      // 新規データの場合は追加
      await admin.firestore()
        .collection('companies')
        .doc(companyId)
        .collection('employees')
        .doc(employeeId)
        .collection('premiumsInfo')
        .doc(`${salaryData.paymentDate}_${salaryData.salaryType}`)
        .set({
          ...insuranceCalculation,
          createdAt: admin.firestore.Timestamp.now()
        });
    }

    // 会社納付額の計算と保存
    const totalPremiums = await calculateTotalPremiums(companyId, salaryData.paymentDate, salaryData.salaryType);
    
    // 既存のtotalPremiums情報を検索
    const existingTotalPremiumsQuery = await admin.firestore()
      .collection('companies')
      .doc(companyId)
      .collection('totalPremiums')
      .doc(`${salaryData.paymentDate}_${salaryData.salaryType}`)
      .get();

    if (existingTotalPremiumsQuery.exists) {
      // 既存データがある場合は更新
      await existingTotalPremiumsQuery.ref.update({
        ...totalPremiums,
        paymentDate: salaryData.paymentDate,
        salaryType: salaryData.salaryType,
        updatedAt: admin.firestore.Timestamp.now()
      });
    } else {
      // 新規データの場合は追加
      await admin.firestore()
        .collection('companies')
        .doc(companyId)
        .collection('totalPremiums')
        .doc(`${salaryData.paymentDate}_${salaryData.salaryType}`)
        .set({
          ...totalPremiums,
          paymentDate: salaryData.paymentDate,
          salaryType: salaryData.salaryType,
          createdAt: admin.firestore.Timestamp.now()
        });
    }

    // エラー状態をクリア
    await docRef.update({
      insuranceCalculationError: null,
      insuranceCalculationStatus: 'success',
      lastErrorAt: admin.firestore.Timestamp.now()
    });

    console.log('保険料計算が完了しました');
    return null;
  } catch (error) {
    console.error('保険料計算中にエラーが発生:', error);
    // エラー状態を記録
    await docRef.update({
      insuranceCalculationError: error instanceof Error ? error.message : '不明なエラーが発生しました',
      insuranceCalculationStatus: 'error',
      lastErrorAt: admin.firestore.Timestamp.now()
    });
    return null;
  }
}

// 作成時のトリガー
export const onSalaryCreated = onDocumentCreated(
  'companies/{companyId}/employees/{employeeId}/salaryInfo/{salaryId}',
  async (event) => {
    console.log('=== 作成トリガーが発火しました ===');
    console.log('パス:', event.params);
    
    const salaryData = event.data?.data();
    const { companyId, employeeId } = event.params;

    if (!salaryData || !event.data) {
      console.error('給与データが見つかりません');
      return null;
    }

    // エラー状態の場合は処理をスキップ
    if (salaryData.insuranceCalculationStatus === 'error') {
      console.log('エラー状態のため、処理をスキップします');
      return null;
    }

    try {
      await processSalaryData(salaryData, companyId, employeeId, event.data.ref);
      return null;
    } catch (error) {
      console.error('処理中にエラーが発生:', error);
      // エラー状態を設定
      await event.data.ref.update({
        insuranceCalculationError: error instanceof Error ? error.message : '不明なエラーが発生しました',
        insuranceCalculationStatus: 'error',
        lastErrorAt: admin.firestore.Timestamp.now()
      });
      return null;
    }
  }
);

// 更新時のトリガー
export const onSalaryUpdated = onDocumentUpdated(
  'companies/{companyId}/employees/{employeeId}/salaryInfo/{salaryId}',
  async (event) => {
    console.log('=== 更新トリガーが発火しました ===');
    console.log('パス:', event.params);
    
    if (!event.data) {
      console.error('イベントデータが見つかりません');
      return null;
    }

    const salaryData = event.data.after.data();
    const { companyId, employeeId } = event.params;

    if (!salaryData) {
      console.error('給与データが見つかりません');
      return null;
    }

    // エラー状態の場合は処理をスキップ
    if (salaryData.insuranceCalculationStatus === 'error') {
      console.log('エラー状態のため、処理をスキップします');
      return null;
    }

    try {
      await processSalaryData(salaryData, companyId, employeeId, event.data.after.ref);
      return null;
    } catch (error) {
      console.error('処理中にエラーが発生:', error);
      // エラー状態を設定
      await event.data.after.ref.update({
        insuranceCalculationError: error instanceof Error ? error.message : '不明なエラーが発生しました',
        insuranceCalculationStatus: 'error',
        lastErrorAt: admin.firestore.Timestamp.now()
      });
      return null;
    }
  }
);